import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const DEFAULT_CREDITS = 1000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { data: user } = await db
    .from('users')
    .select('credits')
    .eq('id', session.user.id)
    .single();

  const credits = user?.credits ?? DEFAULT_CREDITS;

  return NextResponse.json({
    credits,
    maxCredits: DEFAULT_CREDITS,
    percentage: Math.min(100, (credits / DEFAULT_CREDITS) * 100),
    isLow: credits < Math.round(DEFAULT_CREDITS * 0.1),
  });
}
