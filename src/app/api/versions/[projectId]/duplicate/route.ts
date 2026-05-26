import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { projectId } = await params;
  const body = await req.json() as { versionId?: string };

  if (!body.versionId) {
    return NextResponse.json({ error: 'versionId 是必填参数' }, { status: 400 });
  }

  // Get original project data
  const { data: original } = await db
    .from('projects')
    .select('template_id, name, selected_skills, design_profile, description')
    .eq('id', projectId)
    .eq('user_id', session.user.id)
    .single();

  if (!original) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  // Get version HTML
  const { data: version } = await db
    .from('versions')
    .select('html_content')
    .eq('id', body.versionId)
    .eq('project_id', projectId)
    .single();

  if (!version) {
    return NextResponse.json({ error: '版本不存在' }, { status: 404 });
  }

  const { data, error } = await db
    .from('projects')
    .insert({
      user_id: session.user.id,
      template_id: original.template_id,
      name: original.name + ' (分支)',
      current_html: version.html_content,
      selected_skills: original.selected_skills,
      design_profile: original.design_profile,
      description: original.description,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
