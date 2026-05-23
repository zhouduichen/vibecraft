import { NextResponse } from 'next/server';
import { getTemplateMeta, loadTemplateHtml } from '@/lib/templates/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const template = getTemplateMeta(id);

  if (!template) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 });
  }

  const html = await loadTemplateHtml(id);

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
