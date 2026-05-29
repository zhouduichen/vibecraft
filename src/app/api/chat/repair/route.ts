import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildSystemPrompt, buildRepairPrompt } from '@/lib/prompt';
import { extractGeneratedHtml } from '@/lib/ai/html';
import { asTrimmedString, asUuid, validationError } from '@/lib/api/validation';
import {
  runPipeline,
  WorkerHttpError,
  WorkerSchemaError,
  WorkerUnreachableError,
} from '@/lib/worker-bridge';

const MAX_RETRIES = 2;

function asRetryAttempt(value: unknown): number {
  if (value === undefined) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('attemptCount must be a non-negative integer');
  }
  return value;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  let projectId: string;
  let failedHtml: string;
  let previousHtml: string | undefined;
  let userDemand: string;
  let errorMessage: string | undefined;
  let attemptCount: number;

  try {
    const body = await req.json() as {
      projectId?: unknown;
      failedHtml?: unknown;
      previousHtml?: unknown;
      userDemand?: unknown;
      errorMessage?: unknown;
      attemptCount?: unknown;
    };

    projectId = asUuid(body.projectId, 'projectId');
    failedHtml = asTrimmedString(body.failedHtml, 'failedHtml', 20, 500000);
    previousHtml = body.previousHtml !== undefined
      ? asTrimmedString(body.previousHtml, 'previousHtml', 0, 500000)
      : undefined;
    userDemand = asTrimmedString(body.userDemand, 'userDemand', 1, 2000);
    errorMessage = body.errorMessage !== undefined
      ? asTrimmedString(body.errorMessage, 'errorMessage', 0, 2000)
      : undefined;
    attemptCount = asRetryAttempt(body.attemptCount);
  } catch (err) {
    return NextResponse.json(validationError(err instanceof Error ? err.message : 'Invalid request'), { status: 400 });
  }

  if (attemptCount >= MAX_RETRIES) {
    return NextResponse.json({ error: '已超过最大重试次数，请重新描述需求' }, { status: 429 });
  }

  const { data: project } = await db
    .from('projects')
    .select('design_profile, current_html, template_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const systemPrompt = buildSystemPrompt(project.design_profile || null, project.template_id);
  const repairPrompt = buildRepairPrompt(
    previousHtml || project.current_html,
    failedHtml,
    userDemand,
    errorMessage
  );

  const aiModel = process.env.AI_MODEL || 'deepseek-ai/DeepSeek-V3';

  let result;
  try {
    result = await runPipeline({
      metadata: { project: projectId, config_version: '1.0.0', created_by: userId },
      components: [{
        id: 'repair-gen',
        kind: 'text_model',
        provider: 'openai',
        model: aiModel,
        system_prompt: systemPrompt,
        prompt: repairPrompt,
        temperature: 0.3,
      }],
    });
  } catch (err) {
    if (err instanceof WorkerUnreachableError) {
      return NextResponse.json({
        error: '修复服务暂时不可用',
        repairedCode: null,
        attemptCount: attemptCount + 1,
      }, { status: 503 });
    }

    if (err instanceof WorkerHttpError || err instanceof WorkerSchemaError) {
      return NextResponse.json({
        error: '修复服务暂时不可用',
        repairedCode: null,
        attemptCount: attemptCount + 1,
      }, { status: 502 });
    }

    throw err;
  }

  const repairOutput = result.context.results['repair-gen'];
  if (!repairOutput?.success) {
    return NextResponse.json({
      error: repairOutput?.error || 'AI 服务暂时不可用',
      repairedCode: null,
      attemptCount: attemptCount + 1,
    }, { status: 502 });
  }

  const content = (repairOutput.output.content as string) || '';
  const cleanCode = extractGeneratedHtml(content);

  if (!cleanCode) {
    return NextResponse.json({
      error: '修复失败',
      repairedCode: null,
      attemptCount: attemptCount + 1,
    }, { status: 422 });
  }

  const { error: updateError } = await db
    .from('projects')
    .update({ draft_html: cleanCode })
    .eq('id', projectId)
    .eq('user_id', userId);

  if (updateError) {
    return NextResponse.json({ error: '保存修复草稿失败' }, { status: 500 });
  }

  return NextResponse.json({
    repairedCode: cleanCode,
    attemptCount: attemptCount + 1,
  });
}
