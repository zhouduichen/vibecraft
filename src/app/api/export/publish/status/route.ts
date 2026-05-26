import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId 是必填参数' }, { status: 400 });
  }

  // Fetch project updated_at for is_outdated comparison
  const { data: project } = await db
    .from('projects')
    .select('updated_at')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const { data, error } = await db
    .from('published_apps')
    .select('id, slug, title, description, cover_url, visibility, version_id, created_at, updated_at')
    .eq('project_id', projectId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ published: false });
  }

  // Published app is outdated if project was updated after last publish
  const isOutdated = new Date(project.updated_at) > new Date(data.updated_at);

  return NextResponse.json({ published: true, is_outdated: isOutdated, ...data });
}
