import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SKILLS } from '@/config/skills';
import { validateGeneratedHtml } from '@/lib/ai/validate';

const CREDITS_PER_COMMIT = 10;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json() as { projectId?: string };
  const projectId = body.projectId;
  if (!projectId || typeof projectId !== 'string') {
    return NextResponse.json({ error: '缺少项目 ID' }, { status: 400 });
  }

  // Get project and verify ownership + draft exists
  const { data: project, error: fetchError } = await db
    .from('projects')
    .select('id, draft_html, name')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  if (!project.draft_html) {
    return NextResponse.json({ error: '没有待提交的草稿' }, { status: 400 });
  }

  // Get project's selected_skills for validation
  const { data: projectFull, error: projectError } = await db
    .from('projects')
    .select('selected_skills')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (projectError || !projectFull) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // Validate generated HTML against active skills
  const activeSkills = (projectFull.selected_skills || [])
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

  // Use RPC for atomic commit: check credits, deduct, save, create version
  const { error: commitError } = await db.rpc('commit_draft_transaction', {
    p_user_id: userId,
    p_project_id: projectId,
    p_new_html: project.draft_html,
    p_message: `AI 修改: ${project.name}`,
    p_cost: CREDITS_PER_COMMIT,
  });

  if (commitError) {
    const message = (commitError.message || '').includes('insufficient_balance')
      ? '您的算力余额不足，无法完成此次修改'
      : '保存失败，请稍后重试';
    return NextResponse.json({ error: message }, { status: 402 });
  }

  // Clear draft after successful commit
  await db.from('projects').update({ draft_html: null }).eq('id', projectId);

  return NextResponse.json({ success: true });
}
