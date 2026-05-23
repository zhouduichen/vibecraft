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
  const { error } = await db
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
