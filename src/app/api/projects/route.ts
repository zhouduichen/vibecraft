import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TEMPLATES } from '@/config/templates';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { template_id, name } = await req.json();
  const template = TEMPLATES.find(t => t.id === template_id);
  if (!template) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 });
  }

  const { data, error } = await db
    .from('projects')
    .insert({
      user_id: session.user.id,
      template_id,
      name: name || template.name,
      current_html: template.html,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('user_id', session.user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
