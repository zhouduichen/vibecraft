import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTemplateMeta, loadTemplateHtml } from '@/lib/templates/server';
import { buildBlankTemplateHtml } from '@/lib/templates/blank';

type CreateProjectRequest = {
  template_id?: string;
  name?: string;
  from_scratch?: boolean;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const body = await req.json() as CreateProjectRequest;
  const requestedName = typeof body.name === 'string' && body.name.trim()
    ? body.name.trim().slice(0, 80)
    : '未命名项目';

  const templateId = body.from_scratch ? 'blank' : body.template_id;
  const template = getTemplateMeta(templateId);
  if (!template || !templateId) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 });
  }

  const html = templateId === 'blank'
    ? buildBlankTemplateHtml(requestedName)
    : await loadTemplateHtml(templateId);

  const { data, error } = await db
    .from('projects')
    .insert({
      user_id: session.user.id,
      template_id: templateId,
      name: requestedName || template.name,
      current_html: html,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET() {
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
