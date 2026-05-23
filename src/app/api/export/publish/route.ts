import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { asUuid, validationError } from '@/lib/api/validation';

function publicAppUrl(origin: string, slug: string) {
  return `${origin}/app/${slug}`;
}

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

  const { data: project } = await db
    .from('projects')
    .select('current_html')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // Check for existing active published app (upsert)
  const { data: existing } = await db
    .from('published_apps')
    .select('slug')
    .eq('project_id', projectId)
    .is('revoked_at', null)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await db
      .from('published_apps')
      .update({ html_content: project.current_html, updated_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .is('revoked_at', null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const url = publicAppUrl(req.nextUrl.origin, existing.slug);
    return NextResponse.json({ url, slug: existing.slug });
  }

  // Create new published app with slug retry
  let slug: string;
  let insertError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    slug = randomBytes(8).toString('hex');
    const result = await db
      .from('published_apps')
      .insert({
        project_id: projectId,
        slug,
        html_content: project.current_html,
      });
    insertError = result.error;
    if (!insertError) {
      const url = publicAppUrl(req.nextUrl.origin, slug);
      return NextResponse.json({ url, slug });
    }
    if (insertError.code !== '23505') break;
  }

  return NextResponse.json({ error: insertError?.message || '发布失败' }, { status: 500 });
}
