'use client';
import { useRouter } from 'next/navigation';

export default function ExampleProjectCard() {
  const router = useRouter();

  const handleTry = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: 'ledger', name: '示例：我的记账本（含图表）' }),
    });
    const data = await res.json();
    if (data.id) router.push(`/project/${data.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 mb-10">
      <button
        onClick={handleTry}
        className="w-full p-5 rounded-[var(--radius-xl)] border text-left group relative overflow-hidden focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-raised) 100%)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle 400px at var(--glow-x, 50%) var(--glow-y, 50%), rgba(108,114,240,0.08), transparent)',
          }}
        />
        <div className="relative flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-accent-subtle)' }}
            aria-hidden="true"
          >
            <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              1 分钟体验 VibeCraft
            </h2>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              点进来，试试输入"帮我加个饼图"看看 AI 怎么帮你改代码
            </p>
          </div>
          <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all duration-200 text-lg shrink-0" aria-hidden="true">
            →
          </span>
        </div>
      </button>
    </div>
  );
}
