'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import EmptyState from '@/components/EmptyState';
import BalanceBar from '@/components/BalanceBar';

interface ProjectSummary {
  id: string;
  name: string;
  template_id: string;
  updated_at: string;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">我的项目</h1>
            <p className="text-sm text-slate-400">{session?.user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <BalanceBar />
            <button
              onClick={() => router.push('/')}
              className="text-sm px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition"
            >
              + 新建项目
            </button>
          </div>
        </div>

        {projects.length === 0 && <EmptyState />}

        {projects.length > 0 && (
          <div className="space-y-3">
            {projects.map(p => (
              <div
                key={p.id}
                onClick={() => router.push(`/project/${p.id}`)}
                className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium group-hover:text-indigo-400 transition">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {p.template_id} · 更新于 {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <span className="text-slate-600 group-hover:text-indigo-400 transition text-sm">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
