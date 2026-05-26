import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { asUuid, validationError } from '@/lib/api/validation';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let projectId: string;
  try {
    const body = await req.json() as { projectId?: unknown };
    projectId = asUuid(body.projectId, 'projectId');
  } catch (err) {
    return NextResponse.json(validationError(err instanceof Error ? err.message : 'Invalid request'), { status: 400 });
  }

  // Verify ownership
  const { data: project } = await db
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const { error } = await db
    .from('published_apps')
    .update({ revoked_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .is('revoked_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
