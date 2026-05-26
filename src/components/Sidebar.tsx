'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useSidebar } from '@/hooks/useSidebar';
import type { Project } from '@/lib/db';

const iconCls = 'h-5 w-5';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { open, setOpen, toggle } = useSidebar();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!session?.user) {
        setProjects([]);
        return;
      }
      fetch('/api/projects')
        .then(res => res.json())
        .then(data => { if (!cancelled && Array.isArray(data)) setProjects(data); })
        .catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session?.user, pathname]);

  const navigate = (to: string) => {
    router.push(to);
    setOpen(false);
  };

  const isActive = (path: string) => pathname === path;

  const navButton = (
    onClick: () => void,
    active: boolean,
    label: string,
    icon: ReactNode,
    expanded: boolean
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={expanded ? undefined : label}
      className={`flex items-center rounded-full transition-all duration-150 active:scale-[0.94] ${
        expanded ? 'w-full justify-start gap-3 px-3' : 'justify-center'
      }`}
      style={{
        width: expanded ? '100%' : 40,
        height: 40,
        background: active ? 'var(--color-accent-subtle)' : 'transparent',
        color: active ? 'var(--color-accent)' : 'var(--sidebar-text)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--color-accent-subtle)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span className="shrink-0">{icon}</span>
      {expanded && <span className="truncate text-[13px] font-medium">{label}</span>}
    </button>
  );

  const sidebarContent = (expanded: boolean) => (
    <aside
      className={`relative z-30 flex h-full shrink-0 flex-col gap-1 border-r py-3 transition-[width] duration-200 ${
        expanded ? 'items-stretch px-2' : 'items-center px-0'
      }`}
      style={{
        width: expanded ? 200 : 60,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className={`flex h-10 items-center ${expanded ? 'justify-between px-2' : 'justify-center'}`}>
        {expanded && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="truncate text-[15px] font-semibold"
            style={{ color: 'var(--sidebar-brand)' }}
          >
            VibeCraft
          </button>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={expanded ? '收起侧边栏' : '展开侧边栏'}
          title={expanded ? '收起侧边栏' : '展开侧边栏'}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 active:scale-[0.94]"
          style={{ color: 'var(--sidebar-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-accent-subtle)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {expanded ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
          </svg>
        </button>
      </div>

      {navButton(
        () => navigate('/'),
        isActive('/'),
        '新建',
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.232 5.232l3.536 3.536M9 11l-5 5 1.5 1.5L9 21l.354-.354M17.303 3.697a2.37 2.37 0 012.121.586 2.37 2.37 0 01.586 2.121L19 8l-3-3 1.303-1.303z" />
        </svg>,
        expanded
      )}

      {navButton(
        () => navigate('/projects'),
        isActive('/projects'),
        '我的作品',
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>,
        expanded
      )}

      {navButton(
        () => {},
        false,
        '搜索',
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>,
        expanded
      )}

      {navButton(
        () => navigate('/templates'),
        isActive('/templates'),
        '模板',
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>,
        expanded
      )}

      {expanded && (
        <div className="mt-4 flex flex-col min-h-0 flex-1">
          <button onClick={() => navigate('/projects')} className="mb-2 px-3 text-[11px] font-medium shrink-0 flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: 'var(--sidebar-muted)' }}>
            最近项目
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          {projects.length === 0 ? (
            <div className="px-3 text-[12px] leading-relaxed" style={{ color: 'var(--sidebar-muted)' }}>从模板或新建入口开始创作。</div>
          ) : (
            <div className="flex flex-col gap-0.5 overflow-y-auto px-2">
              {projects.slice(0, 50).map(project => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => router.push(`/project/${project.id}`)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all duration-150"
                  style={{
                    color: isActive(`/project/${project.id}`) ? 'var(--color-accent)' : 'var(--sidebar-text)',
                    background: isActive(`/project/${project.id}`) ? 'var(--color-accent-subtle)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(`/project/${project.id}`)) e.currentTarget.style.background = 'var(--color-accent-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(`/project/${project.id}`)) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ opacity: 0.5 }}>
                    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="truncate text-[12px]">{project.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!expanded && <div className="flex-1" />}

      {navButton(
        () => {},
        false,
        '设置',
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>,
        expanded
      )}

      <div className="mt-1 mb-1">
        {session?.user ? (
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="退出登录"
            className={`flex items-center rounded-full transition-all duration-150 active:scale-[0.94] ${
              expanded ? 'w-full justify-start gap-3 px-3' : 'justify-center'
            }`}
            style={{
              width: expanded ? '100%' : 34,
              height: 34,
              background: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
              {session.user.email?.charAt(0).toUpperCase() || '?'}
            </span>
            {expanded && <span className="truncate text-[12px]">{session.user.email}</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn('github', { callbackUrl: '/' })}
            aria-label="登录"
            className={`flex items-center rounded-full transition-all duration-150 active:scale-[0.94] ${
              expanded ? 'w-full justify-start gap-3 px-3' : 'justify-center'
            }`}
            style={{ width: expanded ? '100%' : 34, height: 34, color: 'var(--sidebar-text)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-accent-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            {expanded && <span className="truncate text-[12px] font-medium">登录</span>}
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden shrink-0 md:flex">{sidebarContent(open)}</div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 animate-slide-in">{sidebarContent(true)}</div>
        </div>
      )}
    </>
  );
}
