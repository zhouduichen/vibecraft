import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { SKILLS } from '@/config/skills';
import { asStringArray, asTrimmedString, validationError } from '@/lib/api/validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  try {
    if (body.name !== undefined) {
      updates.name = asTrimmedString(body.name, 'name', 1, 80);
    }
    if (body.current_html !== undefined) {
      updates.current_html = asTrimmedString(body.current_html, 'current_html', 200, 500000);
    }
    if (body.selected_skills !== undefined) {
      updates.selected_skills = asStringArray(body.selected_skills, 'selected_skills', new Set(Object.keys(SKILLS)));
    }
    if (body.design_profile !== undefined) {
      if (body.design_profile !== null && typeof body.design_profile !== 'object') {
        return NextResponse.json(validationError('design_profile must be an object or null'), { status: 400 });
      }
      updates.design_profile = body.design_profile;
    }
    if (body.description !== undefined) {
      updates.description = asTrimmedString(body.description, 'description', 0, 500);
    }
    if (body.pinned !== undefined) {
      updates.pinned = Boolean(body.pinned);
    }
    if (body.status !== undefined) {
      if (!['active', 'archived'].includes(String(body.status))) {
        return NextResponse.json(validationError('status 必须是 active 或 archived'), { status: 400 });
      }
      updates.status = body.status;
      if (body.status === 'archived') {
        updates.archived_at = new Date().toISOString();
      } else {
        updates.archived_at = null;
      }
    }
  } catch (err) {
    return NextResponse.json(validationError(err instanceof Error ? err.message : 'Invalid request'), { status: 400 });
  }

  const { data, error } = await db
    .from('projects')
    .update(updates)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await params;
  const { data: project, error: findError } = await db
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (!project) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const { error: publishedAppsError } = await db
    .from('published_apps')
    .delete()
    .eq('project_id', id);

  if (publishedAppsError) {
    return NextResponse.json({ error: publishedAppsError.message }, { status: 500 });
  }

  const { error: versionsError } = await db
    .from('versions')
    .delete()
    .eq('project_id', id);

  if (versionsError) {
    return NextResponse.json({ error: versionsError.message }, { status: 500 });
  }

  const { error: creditsError } = await db
    .from('credit_transactions')
    .update({ project_id: null })
    .eq('project_id', id)
    .eq('user_id', session.user.id);

  if (creditsError) {
    return NextResponse.json({ error: creditsError.message }, { status: 500 });
  }

  const { error: deleteError } = await db
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
