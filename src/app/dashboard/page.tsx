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

const ICONS: Record<string, string> = { ledger: '💰', todo: '✅', checkin: '📅' };

function ProjectSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse">
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 bg-[var(--color-surface-raised)] rounded" />
            <div className="h-2.5 w-24 bg-[var(--color-surface-raised)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
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

  return (
    <main className="py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">我的项目</h1>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1">{session?.user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <BalanceBar />
            <button
              onClick={() => router.push('/')}
              className="text-[13px] px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[var(--radius-md)] font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
            >
              新建项目
            </button>
          </div>
        </div>

        {loading && <ProjectSkeleton />}

        {!loading && projects.length === 0 && <EmptyState />}

        {!loading && projects.length > 0 && (
          <div className="space-y-2" role="list" aria-label="项目列表">
            {projects.map(p => (
              <div
                key={p.id}
                role="listitem"
                tabIndex={0}
                onClick={() => router.push(`/project/${p.id}`)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/project/${p.id}`); } }}
                className="flex items-center gap-4 px-4 py-3.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] cursor-pointer transition-ui group focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-base)] flex items-center justify-center text-lg shrink-0" aria-hidden="true">
                  {ICONS[p.template_id] || '📱'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">{p.name}</h2>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                    更新于 {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
                <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all duration-200 text-sm shrink-0" aria-hidden="true">→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
