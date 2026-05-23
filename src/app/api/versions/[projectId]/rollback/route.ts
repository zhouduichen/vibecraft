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
  const { versionId } = await req.json();

  const { data, error } = await db.rpc('rollback_project_version', {
    p_user_id: session.user.id,
    p_project_id: projectId,
    p_version_id: versionId,
  });

  if (error || typeof data !== 'string') {
    return NextResponse.json({ error: error?.message || '回滚失败' }, { status: 500 });
  }

  return NextResponse.json({ html_content: data });
}
