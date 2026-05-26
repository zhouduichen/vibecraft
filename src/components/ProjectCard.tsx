'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/db';

interface ProjectWithPublish extends Project {
  publish_status?: { published: boolean; is_outdated?: boolean };
}

interface ProjectCardProps {
  project: ProjectWithPublish;
  onUpdate: () => void;
}

export default function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [renderedAt] = useState(() => Date.now());

  const handleAction = async (action: string) => {
    setLoading(action);
    try {
      switch (action) {
        case 'open':
          router.push(`/project/${project.id}`);
          return;
        case 'duplicate': {
          await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' });
          onUpdate();
          break;
        }
        case 'togglePin':
          await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned: !project.pinned }),
          });
          onUpdate();
          break;
        case 'archive':
          await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'archived' }),
          });
          onUpdate();
          break;
        case 'unarchive':
          await fetch(`/api/projects/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'active' }),
          });
          onUpdate();
          break;
        case 'delete':
          if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) return;
          await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
          onUpdate();
          break;
      }
    } catch {} finally {
      setLoading(null);
    }
    setMenuOpen(false);
  };

  const templateName = (() => {
    try { return project.template_id; } catch { return ''; }
  })();

  const timeAgo = (dateStr: string) => {
    const diff = renderedAt - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div
      className="group relative rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={() => router.push(`/project/${project.id}`)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--color-base)' }}>
        {project.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnail_url} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl select-none opacity-20">◻</span>
        )}
        {/* Status badges */}
        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
          {project.pinned && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.2)', color: '#f59e0b' }}>
              置顶
            </span>
          )}
          {project.status === 'archived' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-base)', color: 'var(--color-text-muted)' }}>
              已归档
            </span>
          )}
          {project.publish_status?.published && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5"
              style={{
                background: project.publish_status.is_outdated ? 'rgba(251,146,60,0.15)' : 'rgba(34,197,94,0.15)',
                color: project.publish_status.is_outdated ? '#f97316' : '#16a34a',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {project.publish_status.is_outdated ? '有更新' : '已发布'}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {project.name}
            </h3>
            {project.description && (
              <p className="text-[12px] mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                {project.description}
              </p>
            )}
          </div>
          {/* Menu button */}
          <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-border)]"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="更多操作"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-36 py-1 rounded-lg border z-50 shadow-lg"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                {[
                  { key: 'duplicate', label: '复制项目' },
                  { key: 'togglePin', label: project.pinned ? '取消置顶' : '置顶项目' },
                  ...(project.status === 'archived'
                    ? [{ key: 'unarchive', label: '恢复项目' }]
                    : [{ key: 'archive', label: '归档项目' }]),
                  { key: 'delete', label: '删除项目', danger: true },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => handleAction(item.key)}
                    disabled={loading === item.key}
                    className="w-full text-left px-3 py-1.5 text-[12px] transition-colors disabled:opacity-50"
                    style={{
                      color: 'danger' in item ? '#ef4444' : 'var(--color-text-primary)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
            {templateName}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            {timeAgo(project.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
