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

  const { data: version } = await db
    .from('versions')
    .select('*')
    .eq('id', versionId)
    .eq('project_id', projectId)
    .single();

  if (!version) {
    return NextResponse.json({ error: '版本不存在' }, { status: 404 });
  }

  const { error } = await db
    .from('projects')
    .update({ current_html: version.html_content, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ html_content: version.html_content });
}
