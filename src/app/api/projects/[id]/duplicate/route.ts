import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch original project
  const { data: original, error: fetchError } = await db
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: '项目不存在' }, { status: 404 });
  }

  const { data, error } = await db
    .from('projects')
    .insert({
      user_id: session.user.id,
      template_id: original.template_id,
      name: original.name + ' (副本)',
      current_html: original.current_html,
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
