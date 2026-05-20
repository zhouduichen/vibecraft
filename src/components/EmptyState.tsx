'use client';
import { useRouter } from 'next/navigation';

export default function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <button
        onClick={() => router.push('/')}
        className="group relative p-8 rounded-2xl border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 bg-slate-800/30 hover:bg-slate-800/50 transition-all duration-300 max-w-md w-full text-center"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="relative">
          <div className="text-4xl mb-3">✨</div>
          <h2 className="text-xl font-bold text-white mb-2">召唤你的第一个 Vibe 个人微应用</h2>
          <p className="text-sm text-slate-400">选一个模板，描述你的想法，AI 帮你实现</p>
        </div>
      </button>
    </div>
  );
}
