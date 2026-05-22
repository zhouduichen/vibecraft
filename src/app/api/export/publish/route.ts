import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

type InsertError = {
  code?: string;
  message?: string;
} | null;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { projectId } = await req.json();

  const { data: project } = await db
    .from('projects')
    .select('current_html')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // Retry on slug collision
  let slug: string;
  let error: InsertError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    slug = randomBytes(8).toString('hex');
    const result = await db
      .from('published_apps')
      .insert({
        project_id: projectId,
        slug,
        html_content: project.current_html,
      });
    error = result.error;
    if (!error) {
      const url = `${req.nextUrl.origin}/app/${slug}`;
      return NextResponse.json({ url, slug });
    }
    // If not a unique violation, fail immediately
    if (error.code !== '23505') break;
  }

  return NextResponse.json({ error: error?.message || '发布失败' }, { status: 500 });
}
