import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildSystemPrompt, buildRepairPrompt } from '@/lib/prompt';
import { extractGeneratedHtml } from '@/lib/ai/html';

const MAX_RETRIES = 2;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json() as {
    projectId?: string;
    failedHtml?: string;
    previousHtml?: string;
    userDemand?: string;
    errorMessage?: string;
    attemptCount?: number;
  };

  if (!body.projectId || !body.failedHtml || !body.userDemand) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }

  if ((body.attemptCount || 0) >= MAX_RETRIES) {
    return NextResponse.json({ error: '已超出最大重试次数，请重新描述需求' }, { status: 429 });
  }

  // Get project for design profile
  const { data: project } = await db
    .from('projects')
    .select('design_profile, current_html')
    .eq('id', body.projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // Build repair prompt
  const systemPrompt = buildSystemPrompt(project.design_profile || null);
  const repairPrompt = buildRepairPrompt(
    body.previousHtml || project.current_html,
    body.failedHtml,
    body.userDemand,
    body.errorMessage
  );

  // Call AI (non-streaming for simplicity)
  const aiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.siliconflow.cn';
  const aiApiKey = process.env.AI_API_KEY;
  const aiModel = process.env.AI_MODEL || 'deepseek-ai/DeepSeek-V3';

  if (!aiApiKey) {
    return NextResponse.json({ error: 'AI API key is not configured' }, { status: 500 });
  }

  const aiResponse = await fetch(`${aiBaseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${aiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: repairPrompt },
      ],
      max_tokens: 8192,
    }),
  });

  if (!aiResponse.ok) {
    return NextResponse.json({ error: 'AI 服务暂时不可用' }, { status: 502 });
  }

  const aiData = await aiResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = aiData.choices?.[0]?.message?.content || '';
  const cleanCode = extractGeneratedHtml(content);

  if (!cleanCode) {
    return NextResponse.json({
      error: '修复失败',
      repairedCode: null,
      attemptCount: (body.attemptCount || 0) + 1,
    }, { status: 422 });
  }

  // Save repaired code as new draft
  await db.from('projects').update({ draft_html: cleanCode }).eq('id', body.projectId);

  return NextResponse.json({
    repairedCode: cleanCode,
    attemptCount: (body.attemptCount || 0) + 1,
  });
}
