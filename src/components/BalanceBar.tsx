'use client';
import { useSession } from 'next-auth/react';

const MAX_CREDITS = 1000;

export default function BalanceBar() {
  const { data: session } = useSession();
  const credits = session?.credits ?? MAX_CREDITS;
  const pct = Math.min(100, (credits / MAX_CREDITS) * 100);
  const isLow = pct < 10;

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
        <div
          className={"h-full rounded-full transition-all duration-500 " + (isLow ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-accent)]')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={"text-[12px] font-medium " + (isLow ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
        {isLow ? '余额不足' : `算力 ${Math.round(pct)}%`}
      </span>
    </div>
  );
}
