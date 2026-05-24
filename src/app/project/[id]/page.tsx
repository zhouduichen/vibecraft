'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PreviewPane from '@/components/PreviewPane';
import ChatPanel from '@/components/ChatPanel';
import VersionTimeline from '@/components/VersionTimeline';
import ExportMenu from '@/components/ExportMenu';
import BalanceBar from '@/components/BalanceBar';
import { useSidebar } from '@/hooks/useSidebar';
import { TEMPLATE_CATALOG } from '@/lib/templates/catalog';
import type { Project, DesignProfile } from '@/lib/db';

export default function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [designProfile, setDesignProfile] = useState<DesignProfile | null>(null);
  const { toggle } = useSidebar();

  // Draft-commit state
  const [draftCode, setDraftCode] = useState<string | null>(null);
  const [lastDemand, setLastDemand] = useState('');

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (data.error) { router.push('/'); return; } setProject(data); setCurrentCode(data.current_html); setDesignProfile(data.design_profile || null); })
      .catch(() => { setFetchError(true); });
  }, [id, router]);

  const handleCodeUpdate = useCallback((code: string) => { setCurrentCode(code); }, []);
  const handleRollback = useCallback((code: string) => { setCurrentCode(code); }, []);

  // Called by ChatPanel when new draft is ready
  const handleDraftReady = useCallback((code: string, demand: string) => {
    setDraftCode(code);
    setLastDemand(demand);
  }, []);

  // Called by PreviewPane when iframe renders successfully
  const handleRenderReady = useCallback(async () => {
    if (!draftCode) return;
    try {
      const res = await fetch('/api/chat/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('Commit failed:', err.error);
      }
    } catch (e) {
      console.error('Commit error:', e);
    }
    setDraftCode(null);
    setLastDemand('');
  }, [draftCode, id]);

  // Called by PreviewPane when iframe errors
  const handleRenderError = useCallback(async () => {
    if (!draftCode || !lastDemand) return;
    try {
      const res = await fetch('/api/chat/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          failedHtml: draftCode,
          userDemand: lastDemand,
          attemptCount: 0,
        }),
      });
      const data = await res.json();
      if (data.repairedCode) {
        setCurrentCode(data.repairedCode);
        setDraftCode(data.repairedCode);
      }
    } catch (e) {
      console.error('Repair error:', e);
    }
  }, [draftCode, lastDemand, id]);

  if (fetchError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>加载失败</p>
        <button
          onClick={() => router.push('/')}
          className="text-[12px] font-medium transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          ← 返回
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header bar */}
      <header
        className="h-11 flex items-center justify-between px-4 shrink-0 border-b relative z-10"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={toggle}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: '#555' }}
            aria-label="菜单"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <h1 className="text-[13px] font-semibold truncate" style={{ color: '#111' }}>
            {project.name}
          </h1>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
            style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            {(() => {
              const t = TEMPLATE_CATALOG.find(m => m.id === project.template_id);
              return t?.name ?? project.template_id;
            })()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <BalanceBar />
          <button
            onClick={() => setShowVersions(v => !v)}
            aria-pressed={showVersions}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
            style={{
              background: showVersions ? 'var(--color-accent-subtle)' : 'transparent',
              color: showVersions ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}
          >
            版本历史
          </button>
          <ExportMenu projectId={id} />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Chat sidebar — slim */}
        <div
          className="w-[260px] xl:w-[280px] flex flex-col shrink-0 border-r"
          style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
        >
          <ChatPanel
            projectId={id}
            templateId={project.template_id}
            selectedSkills={project.selected_skills || []}
            designProfile={designProfile}
            onDesignProfileChange={setDesignProfile}
            onCodeUpdate={handleCodeUpdate}
            onStreamStart={() => setIsStreaming(true)}
            onStreamEnd={() => setIsStreaming(false)}
            onDraftReady={handleDraftReady}
            onDraftError={handleRenderError}
          />
        </div>

        {/* Preview — dominant */}
        <div className="flex-1 flex min-w-0">
          <div className="flex-1">
            <PreviewPane
              code={currentCode}
              onRenderError={handleRenderError}
              onRenderReady={handleRenderReady}
              isStreaming={isStreaming}
            />
          </div>

          {/* Version timeline panel */}
          {showVersions && (
            <div
              className="w-60 overflow-y-auto shrink-0 scrollbar-thin border-l"
              style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
            >
              <VersionTimeline projectId={id} onRollback={handleRollback} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
