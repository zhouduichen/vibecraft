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
    <div className="max-w-5xl mx-auto mb-12">
      <button onClick={handleTry}
        className="w-full p-5 rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-ui text-left group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-subtle)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-lg shrink-0">
            🚀
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              1 分钟体验 VibeCraft
            </h3>
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              点进来，试试输入"帮我加个饼图"看看 AI 怎么帮你改代码
            </p>
          </div>
          <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all duration-200 text-lg shrink-0">
            →
          </span>
        </div>
      </button>
    </div>
  );
}
