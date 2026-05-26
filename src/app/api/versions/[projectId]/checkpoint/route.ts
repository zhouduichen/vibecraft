import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json() as { versionId?: string; name?: string };

  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId 是必填参数' }, { status: 400 });
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

  // Clear existing checkpoints and set new one
  const { error: clearError } = await db
    .from('versions')
    .update({ is_checkpoint: false })
    .eq('project_id', projectId);

  if (clearError) {
    return NextResponse.json({ error: clearError.message }, { status: 500 });
  }

  const updates: Record<string, unknown> = { is_checkpoint: true };
  if (body.name) updates.message = body.name;

  const { error } = await db
    .from('versions')
    .update(updates)
    .eq('id', body.versionId)
    .eq('project_id', projectId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
