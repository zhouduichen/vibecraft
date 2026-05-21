'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import EmptyState from '@/components/EmptyState';
import BalanceBar from '@/components/BalanceBar';
import { useTiltCard } from '@/lib/useMouse';

interface ProjectSummary {
  id: string;
  name: string;
  template_id: string;
  updated_at: string;
}

const ICONS: Record<string, string> = { ledger: '💰', todo: '✅', checkin: '📅' };

function ProjectSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-lg)] skeleton-shimmer"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-surface)] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 bg-[var(--color-surface)] rounded" />
            <div className="h-2.5 w-24 bg-[var(--color-surface)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectItem({ p }: { p: ProjectSummary }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useTiltCard(ref);

  return (
    <div
      ref={ref}
      role="listitem"
      tabIndex={0}
      onClick={() => router.push(`/project/${p.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/project/${p.id}`); } }}
      className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] cursor-pointer group relative overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 tilt-card"
      style={{ transform: 'rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))' }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(circle 200px at var(--glow-x, 50%) var(--glow-y, 50%), rgba(108,114,240,0.06), transparent)',
        }}
      />
      <div
        className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-lg shrink-0 relative"
        style={{ background: 'var(--color-base)' }}
        aria-hidden="true"
      >
        {ICONS[p.template_id] || '📱'}
      </div>
      <div className="flex-1 min-w-0 relative">
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)] truncate">{p.name}</h2>
        <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
          更新于 {new Date(p.updated_at).toLocaleDateString('zh-CN')}
        </p>
      </div>
      <svg
        className="w-4 h-4 shrink-0 relative transition-all duration-200"
        style={{ color: 'var(--color-text-muted)', transform: 'translateX(0)' }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
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
    <main className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--color-text-primary)]">
            我的项目
          </h1>
          {session?.user?.email && (
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1.5">{session.user.email}</p>
          )}
        </div>

        {loading && <ProjectSkeleton />}

        {!loading && projects.length === 0 && <EmptyState />}

        {!loading && projects.length > 0 && (
          <>
            <div className="space-y-3" role="list" aria-label="项目列表">
              {projects.map(p => (
                <ProjectItem key={p.id} p={p} />
              ))}
            </div>

            <div className="mt-10 flex items-center justify-between">
              <BalanceBar />
              <button
                onClick={() => router.push('/')}
                className="text-[13px] px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[var(--radius-md)] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 active:scale-[0.98]"
              >
                新建项目
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
