import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTemplateMeta, loadTemplateHtml } from '@/lib/templates/server';
import { buildBlankTemplateHtml } from '@/lib/templates/blank';

type CreateProjectRequest = {
  template_id?: string;
  name?: string;
  from_scratch?: boolean;
  description?: string;
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
  const description = typeof body.description === 'string' && body.description.trim()
    ? body.description.trim().slice(0, 500)
    : undefined;

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
      ...(description ? { description } : {}),
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

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || 'active';
  const templateId = searchParams.get('template_id');
  const search = searchParams.get('search');
  const pinned = searchParams.get('pinned');
  const withPublishStatus = searchParams.get('with_publish_status') === 'true';

  let query = db
    .from('projects')
    .select('*')
    .eq('user_id', session.user.id);

  if (status !== 'all') {
    query = query.eq('status', status);
  }
  if (templateId) {
    query = query.eq('template_id', templateId);
  }
  if (pinned === 'true') {
    query = query.eq('pinned', true);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Batch fetch publish status for all projects if requested
  let publishStatusMap: Record<string, { published: boolean; is_outdated?: boolean }> = {};
  if (withPublishStatus && data && data.length > 0) {
    const projectIds = data.map(p => p.id);
    const { data: publishedData } = await db
      .from('published_apps')
      .select('project_id, updated_at')
      .in('project_id', projectIds)
      .is('revoked_at', null);

    if (publishedData) {
      const pubMap: Record<string, string> = {};
      publishedData.forEach(p => { pubMap[p.project_id] = p.updated_at; });
      publishStatusMap = Object.fromEntries(
        data.map(p => [
          p.id,
          {
            published: p.id in pubMap,
            is_outdated: p.id in pubMap ? new Date(p.updated_at) > new Date(pubMap[p.id]) : false,
          },
        ])
      );
    }
  }

  return NextResponse.json(
    withPublishStatus
      ? data.map(p => ({ ...p, publish_status: publishStatusMap[p.id] || { published: false } }))
      : data
  );
}
