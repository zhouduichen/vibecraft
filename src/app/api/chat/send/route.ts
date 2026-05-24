import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SKILLS } from '@/config/skills';
import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompt';
import { asStringArray, asTrimmedString, asUuid, validationError } from '@/lib/api/validation';
import { extractGeneratedHtml } from '@/lib/ai/html';

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

  // 3. Get project
  const { data: project } = await db
    .from('projects')
    .select('current_html, design_profile, template_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // 4. Build prompts
  const designProfile = project.design_profile || null;
  const systemPrompt = buildSystemPrompt(designProfile, project.template_id);
  const userPrompt = buildUserPrompt(
    project.current_html,
    userDemand,
    selectedSkills,
    SKILLS,
    project.template_id
  );

  // 5. Call AI API with streaming
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

  // 6. Stream response
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

      // 7. Extract final code and save as draft
      const cleanCode = extractGeneratedHtml(fullResponse);

      if (cleanCode) {
        sendStep('saving', '正在生成预览...');

        // Save as draft only — don't deduct credits yet
        const { error: draftError } = await db
          .from('projects')
          .update({ draft_html: cleanCode })
          .eq('id', projectId)
          .eq('user_id', userId);

        if (draftError) {
          console.error('Failed to save draft:', draftError);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '保存草稿失败，请重试' })}\n\n`)
          );
        } else {
          sendStep('draft_ready', '代码已生成，正在验证...');
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
