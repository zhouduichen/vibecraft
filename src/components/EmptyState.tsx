'use client';
import { useRouter } from 'next/navigation';

export default function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center text-2xl mx-auto mb-5">
          ✨
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          创建你的第一个应用
        </h2>
        <p className="text-[14px] text-[var(--color-text-secondary)] mb-6 leading-relaxed">
          选一个模板作为起点，然后告诉 AI 你想怎么改。不需要写一行代码。
        </p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[var(--radius-md)] text-[13px] font-medium transition-ui"
        >
          浏览模板
          <span className="text-base">→</span>
        </button>
      </div>
    </div>
  );
}
