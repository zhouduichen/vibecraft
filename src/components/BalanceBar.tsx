'use client';
import { useState, useEffect, useCallback } from 'react';

const MAX_CREDITS = 1000;

export default function BalanceBar() {
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json() as { credits: number };
        setCredits(data.credits);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch on mount and listen for refresh events
  useEffect(() => {
    const timer = window.setTimeout(fetchCredits, 0);
    const handler = () => fetchCredits();
    window.addEventListener('balance:refresh', handler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('balance:refresh', handler);
    };
  }, [fetchCredits]);

  // Also periodically refresh to stay in sync
  useEffect(() => {
    const interval = setInterval(fetchCredits, 30_000);
    return () => clearInterval(interval);
  }, [fetchCredits]);

  if (credits === null) return null;

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
