import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SKILLS } from '@/config/skills';
import { validateGeneratedHtml } from '@/lib/ai/validate';
import { asTrimmedString, asUuid, validationError } from '@/lib/api/validation';

const CREDITS_PER_COMMIT = 10;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  let projectId: string;
  let userSummary: string | undefined;
  try {
    const body = await req.json() as { projectId?: unknown; summary?: unknown };
    projectId = asUuid(body.projectId, 'projectId');
    userSummary = body.summary !== undefined
      ? asTrimmedString(body.summary, 'summary', 1, 200)
      : undefined;
  } catch (err) {
    return NextResponse.json(validationError(err instanceof Error ? err.message : 'Invalid request'), { status: 400 });
  }

  const { data: project, error: fetchError } = await db
    .from('projects')
    .select('id, draft_html, name, selected_skills')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  if (!project.draft_html) {
    return NextResponse.json({ error: '没有待提交的草稿' }, { status: 400 });
  }

  const activeSkills = (project.selected_skills || [])
    .map((id: string) => SKILLS[id])
    .filter(Boolean);

  const validationResults = validateGeneratedHtml(project.draft_html, activeSkills);
  const failures = validationResults.filter(r => !r.passed);

  if (failures.length > 0) {
    return NextResponse.json({
      error: '技能验证未通过',
      validationFailures: failures.map(f => ({
        skillId: f.skillId,
        message: f.message,
      })),
    }, { status: 422 });
  }

  const summary = userSummary || `AI 修改: ${project.name}`;
  const { error: commitError } = await db.rpc('commit_draft_transaction', {
    p_user_id: userId,
    p_project_id: projectId,
    p_new_html: project.draft_html,
    p_message: summary,
    p_cost: CREDITS_PER_COMMIT,
    p_kind: 'ai_edit',
    p_summary: userSummary || null,
  });

  if (commitError) {
    const rawMessage = commitError.message || '';
    const isInsufficientBalance = rawMessage.includes('insufficient_balance')
      || rawMessage.toLowerCase().includes('insufficient credits');
    const message = isInsufficientBalance
      ? '您的算力余额不足，无法完成本次修改'
      : '保存失败，请稍后重试';
    return NextResponse.json({ error: message }, { status: isInsufficientBalance ? 402 : 500 });
  }

  await db
    .from('projects')
    .update({ draft_html: null })
    .eq('id', projectId)
    .eq('user_id', userId);

  return NextResponse.json({ success: true });
}
