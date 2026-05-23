'use client';
import { useRouter } from 'next/navigation';

export default function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
      <div className="text-center max-w-xs px-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--color-accent-subtle)' }}
        >
          <svg className="w-7 h-7" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <h2 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>还没有项目</h2>
        <p className="text-[12px] mb-6 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          选一个模板作为起点，用自然语言把它变成你想要的应用
        </p>
        <button
          onClick={() => router.push('/templates')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[12px] font-medium transition-all duration-200 hover:-translate-y-px active:scale-[0.98]"
          style={{ background: 'var(--color-accent)', color: '#ffffff' }}
        >
          浏览模板
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
