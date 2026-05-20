'use client';
import { useSession } from 'next-auth/react';

const MAX_CREDITS = 1000;

export default function BalanceBar() {
  const { data: session } = useSession();
  const credits = (session as any)?.credits ?? MAX_CREDITS;
  const pct = Math.min(100, (credits / MAX_CREDITS) * 100);
  const isLow = pct < 10;

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all duration-500 " + (isLow ? 'bg-rose-500' : 'bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={"text-xs " + (isLow ? 'text-rose-400' : 'text-slate-400')}>
        {isLow ? '燃料不足' : `算力 ${Math.round(pct)}%`}
      </span>
    </div>
  );
}
