'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProjectCard from '@/components/ProjectCard';
import type { Project } from '@/lib/db';

type FilterStatus = 'active' | 'archived';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('active');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: filter, with_publish_status: 'true' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data);
    } catch {} finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(fetchProjects, 0);
    return () => window.clearTimeout(timer);
  }, [fetchProjects]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="shrink-0 border-b" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-5xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-[17px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              我的作品
            </h1>
            <button
              onClick={() => router.push('/')}
              className="text-[12px] px-4 py-1.5 rounded-full font-medium transition-all duration-200 active:scale-95"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              新建项目
            </button>
          </div>

          {/* Search + filter bar */}
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" stroke="currentColor" fill="none" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" fill="none" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="搜索项目名称或描述..."
                className="w-full h-9 pl-9 pr-3 text-[13px] rounded-full outline-none transition-colors"
                style={{ background: 'var(--color-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
              />
            </form>
            <div className="flex gap-1 bg-[var(--color-base)] rounded-full p-0.5 border" style={{ borderColor: 'var(--color-border)' }}>
              {(['active', 'archived'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setSearch(''); setSearchInput(''); }}
                  className="px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-all"
                  style={{
                    background: filter === f ? 'var(--color-accent)' : 'transparent',
                    color: filter === f ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {f === 'active' ? '进行中' : '已归档'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-5xl mx-auto px-5 py-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)' }}>
                  <div className="h-3 w-24 rounded mb-3" style={{ background: 'var(--color-border)' }} />
                  <div className="h-2 w-full rounded mb-2" style={{ background: 'var(--color-border)' }} />
                  <div className="h-2 w-3/4 rounded" style={{ background: 'var(--color-border)' }} />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--color-accent-subtle)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                {filter === 'active' ? '还没有项目' : '没有已归档的项目'}
              </p>
              <p className="text-[12px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
                {filter === 'active' ? '创建一个新项目开始创作' : '归档的项目会出现在这里'}
              </p>
              {filter === 'active' && (
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 rounded-full text-[12px] font-medium"
                  style={{ background: 'var(--color-accent)', color: '#fff' }}
                >
                  新建项目
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} onUpdate={fetchProjects} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
