import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TEMPLATE_CATALOG } from '@/lib/templates/catalog';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId 是必填参数' }, { status: 400 });
  }

  const { data: project } = await db
    .from('projects')
    .select('template_id, onboarding_state')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const template = TEMPLATE_CATALOG.find(t => t.id === project.template_id);
  const state = (project.onboarding_state as Record<string, boolean> | null) || {};

  return NextResponse.json({
    starterPrompts: template?.starterPrompts || [],
    milestones: {
      firstAiEdit: !!state.first_ai_edit,
      firstPublish: !!state.first_publish,
      firstRollback: !!state.first_rollback,
    },
    isNewUser: !state.first_ai_edit,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await req.json() as { projectId?: string; milestone?: string };
  if (!body.projectId || !body.milestone) {
    return NextResponse.json({ error: 'projectId 和 milestone 是必填参数' }, { status: 400 });
  }

  const { data: project } = await db
    .from('projects')
    .select('onboarding_state')
    .eq('id', body.projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const state = (project.onboarding_state as Record<string, boolean> | null) || {};
  if (state[body.milestone]) {
    return NextResponse.json({ already: true });
  }

  await db
    .from('projects')
    .update({
      onboarding_state: { ...state, [body.milestone]: true },
    })
    .eq('id', body.projectId);

  return NextResponse.json({ success: true });
}
