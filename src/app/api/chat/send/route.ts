import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SKILLS } from '@/config/skills';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompt';
import { asStringArray, asTrimmedString, asUuid, validationError } from '@/lib/api/validation';
import { extractGeneratedHtml } from '@/lib/ai/html';

const CREDITS_PER_REQUEST = 10;

function getMessage(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Parse and validate request
  let projectId: string;
  let userDemand: string;
  let selectedSkills: string[];
  try {
    const body = await req.json() as { projectId?: unknown; userDemand?: unknown; selectedSkills?: unknown };
    projectId = asUuid(body.projectId, 'projectId');
    userDemand = asTrimmedString(body.userDemand, 'userDemand', 5, 2000);
    selectedSkills = asStringArray(body.selectedSkills, 'selectedSkills', new Set(Object.keys(SKILLS)));
  } catch (err) {
    return NextResponse.json(validationError(err instanceof Error ? err.message : '请求内容过短，请描述具体需求'), { status: 400 });
  }

  // 3. Check credits before the expensive AI call
  const { data: dbUser } = await db
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (!dbUser || dbUser.credits < CREDITS_PER_REQUEST) {
    return NextResponse.json({ error: '您的算力余额不足，无法完成此次修改' }, { status: 402 });
  }

  // 4. Get project
  const { data: project } = await db
    .from('projects')
    .select('current_html, design_profile, template_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // 5. Build prompts
  const designProfile = project.design_profile || null;
  const systemPrompt = buildSystemPrompt(designProfile);
  const userPrompt = buildUserPrompt(
    project.current_html,
    userDemand,
    selectedSkills,
    SKILLS,
    project.template_id
  );

  // 6. Call AI API with streaming
  const aiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.siliconflow.cn';
  const aiApiKey = process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek-ai/DeepSeek-V3';

  if (!aiApiKey) {
    return NextResponse.json({ error: 'AI API key is not configured' }, { status: 500 });
  }

  let aiResponse: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    aiResponse = await fetch(`${aiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${aiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        max_tokens: 8192,
      }),
      signal: controller.signal,
    });
  } catch {
    return NextResponse.json({ error: 'AI 服务暂时不可用，请稍后重试' }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }

  if (!aiResponse.ok) {
    let msg = 'AI 服务暂时不可用，请稍后重试';
    try {
      const errData = await aiResponse.json() as { message?: unknown; error?: { message?: unknown } };
      if (typeof errData.message === 'string') msg = errData.message;
      if (typeof errData.error?.message === 'string') msg = errData.error.message;
    } catch { /* ignore parse failure */ }
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // 7. Stream response
  const body = aiResponse.body;
  if (!body) {
    return NextResponse.json({ error: 'AI 服务响应异常' }, { status: 502 });
  }
  const reader = body.getReader();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';
      let codeSent = false;
      let firstChunk = true;

      const sendStep = (step: string, detail = '') => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'step', step, detail })}\n\n`)
        );
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;

                  if (firstChunk) {
                    firstChunk = false;
                    sendStep('writing', 'AI 正在根据你的需求编写代码...');
                  }

                  // Partial code update for preview — only when we have a COMPLETE block
                  if (fullResponse.includes('```html') && !codeSent && fullResponse.length > 5000) {
                    const match = fullResponse.match(/```html\s*([\s\S]*?)```/);
                    if (match?.[1] && match[1].length > 1000) {
                      codeSent = true;
                      sendStep('applying', '代码初稿生成完毕，正在更新预览...');
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'code', content: match[1].trim() })}\n\n`)
                      );
                    }
                  }
                }
              } catch (err: unknown) {
                if (!(err instanceof SyntaxError)) {
                  console.error('Unexpected error parsing SSE data:', err);
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        console.error('Stream read error:', err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '流式传输中断' })}\n\n`)
        );
      }

      // 8. Extract final code and persist
      const cleanCode = extractGeneratedHtml(fullResponse);

      if (cleanCode) {
        sendStep('saving', '正在保存修改...');
        let saved = false;
        try {
          const { error: saveError } = await db.rpc('chat_send_transaction', {
            p_user_id: userId,
            p_project_id: projectId,
            p_new_html: cleanCode,
            p_message: userDemand,
            p_cost: CREDITS_PER_REQUEST,
          });
          if (saveError) throw saveError;
          saved = true;
        } catch (err: unknown) {
          console.error('Failed to save project:', err);
          const message = getMessage(err);
          const msg = message?.includes('Insufficient credits')
            ? '您的算力余额不足，无法完成此次修改'
            : '保存失败，请稍后重试';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`)
          );
        }
        if (saved) {
          sendStep('done', '修改完成，请在右侧预览查看效果');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'code', content: cleanCode })}\n\n`)
          );
        }
      } else {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'AI 未返回有效代码，请重试' })}\n\n`)
        );
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
