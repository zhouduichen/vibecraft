'use client';
import { useRouter } from 'next/navigation';

export default function ExampleProjectCard() {
  const router = useRouter();

  const handleTry = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: 'ledger',
        name: '示例：我的记账本（含图表）',
      }),
    });
    const data = await res.json();
    if (data.id) router.push(`/project/${data.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto mb-10">
      <button
        onClick={handleTry}
        className="w-full p-5 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 hover:border-indigo-500/60 transition-all duration-300 text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="text-3xl">🚀</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">1 分钟体验 VibeCraft</h3>
            <p className="text-sm text-slate-400 mt-0.5">点进来试试输入"帮我加个饼图"——看看 AI 怎么帮你改代码</p>
          </div>
          <span className="text-indigo-400 group-hover:translate-x-1 transition-transform text-xl">→</span>
        </div>
      </button>
    </div>
  );
}
