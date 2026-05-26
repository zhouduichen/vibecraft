import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { asUuid, asTrimmedString, validationError } from '@/lib/api/validation';

function publicAppUrl(origin: string, slug: string) {
  return `${origin}/app/${slug}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  let projectId: string;
  let title: string | undefined;
  let description: string | undefined;
  let coverUrl: string | undefined;
  let visibility: string | undefined;
  try {
    const body = await req.json() as { projectId?: unknown; title?: unknown; description?: unknown; cover_url?: unknown; visibility?: unknown };
    projectId = asUuid(body.projectId, 'projectId');
    if (body.title !== undefined) title = asTrimmedString(body.title, 'title', 1, 255);
    if (body.description !== undefined) description = asTrimmedString(body.description, 'description', 0, 500);
    if (body.cover_url !== undefined) coverUrl = asTrimmedString(body.cover_url, 'cover_url', 0, 2000);
    if (body.visibility !== undefined) {
      if (!['public', 'unlisted'].includes(String(body.visibility))) {
        return NextResponse.json(validationError('visibility 必须是 public 或 unlisted'), { status: 400 });
      }
      visibility = String(body.visibility);
    }
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
    const updates: Record<string, unknown> = {
      html_content: project.current_html,
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (coverUrl !== undefined) updates.cover_url = coverUrl;
    if (visibility !== undefined) updates.visibility = visibility;

    const { error: updateError } = await db
      .from('published_apps')
      .update(updates)
      .eq('project_id', projectId)
      .is('revoked_at', null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const url = publicAppUrl(req.nextUrl.origin, existing.slug);
    return NextResponse.json({ url, slug: existing.slug });
  }

  // Track first_publish milestone via direct update
  const { data: projectMeta } = await db
    .from('projects')
    .select('onboarding_state')
    .eq('id', projectId)
    .single();

  if (projectMeta) {
    const state = (projectMeta.onboarding_state as Record<string, boolean> | null) || {};
    if (!state.first_publish) {
      await db
        .from('projects')
        .update({ onboarding_state: { ...state, first_publish: true } })
        .eq('id', projectId);
    }
  }

  // Create new published app with slug retry
  let slug: string;
  let insertError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    slug = randomBytes(8).toString('hex');
    const insertPayload: Record<string, unknown> = {
      project_id: projectId,
      slug,
      html_content: project.current_html,
    };
    if (title !== undefined) insertPayload.title = title;
    if (description !== undefined) insertPayload.description = description;
    if (coverUrl !== undefined) insertPayload.cover_url = coverUrl;
    if (visibility !== undefined) insertPayload.visibility = visibility;

    const result = await db
      .from('published_apps')
      .insert(insertPayload);
    insertError = result.error;
    if (!insertError) {
      const url = publicAppUrl(req.nextUrl.origin, slug);
      return NextResponse.json({ url, slug });
    }
    if (insertError.code !== '23505') break;
  }

  return NextResponse.json({ error: insertError?.message || '发布失败' }, { status: 500 });
}
