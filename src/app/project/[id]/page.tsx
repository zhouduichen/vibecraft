'use client';
import { useEffect, useState, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PreviewPane from '@/components/PreviewPane';
import ChatPanel from '@/components/ChatPanel';
import VersionTimeline from '@/components/VersionTimeline';
import SharePanel from '@/components/SharePanel';
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
  const [publishStatus, setPublishStatus] = useState<{ published: boolean; slug?: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const { toggle } = useSidebar();

  // Draft-commit state
  const [draftCode, setDraftCode] = useState<string | null>(null);
  const [lastDemand, setLastDemand] = useState('');
  const [commitError, setCommitError] = useState('');
  const commitInFlightRef = useRef(false);
  const repairAttemptRef = useRef(0);

  // Auto-dismiss commit error after 8s
  useEffect(() => {
    if (!commitError) return;
    const t = setTimeout(() => setCommitError(''), 8000);
    return () => clearTimeout(t);
  }, [commitError]);

  // Preview mode — show a version without rolling back
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const previousProjectHtml = project?.current_html || '';

  const loadProject = useCallback(() => {
    fetch(`/api/projects/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (data.error) { router.push('/'); return; } setProject(data); setCurrentCode(data.current_html); setDesignProfile(data.design_profile || null); setNameInput(data.name); })
      .catch(() => { setFetchError(true); });
  }, [id, router]);

  useEffect(() => { loadProject(); }, [loadProject]);

  // Fetch publish status
  useEffect(() => {
    if (!id) return;
    fetch(`/api/export/publish/status?projectId=${id}`)
      .then(r => r.json())
      .then(data => setPublishStatus(data))
      .catch(() => {});
  }, [id]);

  const handleCodeUpdate = useCallback((code: string) => { setCurrentCode(code); }, []);
  const handleRollback = useCallback((code: string) => { setCurrentCode(code); }, []);

  // Version preview: save current code, load version HTML
  const handleVersionPreview = useCallback((html: string) => {
    if (savedCode === null) {
      setSavedCode(currentCode);
    }
    setCurrentCode(html);
  }, [currentCode, savedCode]);

  const dismissPreview = useCallback(() => {
    if (savedCode !== null) {
      setCurrentCode(savedCode);
      setSavedCode(null);
    }
  }, [savedCode]);

  // Called by ChatPanel when new draft is ready
  const handleDraftReady = useCallback((code: string, demand: string) => {
    setDraftCode(code);
    setLastDemand(demand);
    repairAttemptRef.current = 0;
  }, []);

  // Called by PreviewPane when iframe renders successfully
  const handleRenderReady = useCallback(async () => {
    if (!draftCode || commitInFlightRef.current) return;
    commitInFlightRef.current = true;
    try {
      const res = await fetch('/api/chat/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, summary: lastDemand }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 402) {
          setCommitError(err.error || '算力余额不足');
          window.dispatchEvent(new CustomEvent('balance:refresh'));
        } else {
          setCommitError(err.error || '保存失败，请稍后重试');
        }
      } else {
        setDraftCode(null);
        setLastDemand('');
        repairAttemptRef.current = 0;
        window.dispatchEvent(new CustomEvent('balance:refresh'));
        loadProject();
      }
    } catch (e) {
      console.error('Commit error:', e);
      setCommitError('保存失败，请稍后重试');
    } finally {
      commitInFlightRef.current = false;
    }
  }, [draftCode, id, lastDemand, loadProject]);

  // Called by PreviewPane when iframe errors
  const handleRenderError = useCallback(async (errorMessage = '') => {
    if (!draftCode || !lastDemand) return;
    if (repairAttemptRef.current >= 2) {
      setCommitError('自动修复次数已用完，请调整描述后再试一次');
      setDraftCode(null);
      setLastDemand('');
      return;
    }
    try {
      const res = await fetch('/api/chat/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          failedHtml: draftCode,
          previousHtml: previousProjectHtml,
          userDemand: lastDemand,
          errorMessage,
          attemptCount: repairAttemptRef.current,
        }),
      });
      const data = await res.json();
      if (data.repairedCode) {
        repairAttemptRef.current = data.attemptCount ?? (repairAttemptRef.current + 1);
        setCurrentCode(data.repairedCode);
        setDraftCode(data.repairedCode);
      } else {
        repairAttemptRef.current = data.attemptCount ?? (repairAttemptRef.current + 1);
        setCommitError(data.error || '自动修复失败，请调整描述后再试一次');
      }
    } catch (e) {
      console.error('Repair error:', e);
      setCommitError('自动修复失败，请调整描述后再试一次');
    }
  }, [draftCode, lastDemand, id, previousProjectHtml]);

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
          {/* Editable project name */}
          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={async () => {
                setEditingName(false);
                if (nameInput.trim() && nameInput !== project.name) {
                  await fetch(`/api/projects/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nameInput.trim() }),
                  });
                  loadProject();
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') { setNameInput(project.name); setEditingName(false); }
              }}
              className="text-[13px] font-semibold bg-transparent outline-none border-b border-[var(--color-accent)] px-1 py-0"
              style={{ color: '#111', maxWidth: 200 }}
            />
          ) : (
            <h1
              className="text-[13px] font-semibold truncate cursor-pointer hover:opacity-70 transition-opacity"
              style={{ color: '#111' }}
              onClick={() => setEditingName(true)}
              title="点击重命名"
            >
              {project.name}
            </h1>
          )}
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
            style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            {(() => {
              const t = TEMPLATE_CATALOG.find(m => m.id === project.template_id);
              return t?.name ?? project.template_id;
            })()}
          </span>
          {/* Publish status badge */}
          {publishStatus?.published && (
            <a
              href={`/app/${publishStatus.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              已发布
            </a>
          )}
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
          <SharePanel projectId={id} />
        </div>
      </header>

      {/* Commit error banner */}
      {commitError && (
        <div
          className="flex items-center justify-between px-4 py-2 text-[12px] shrink-0"
          style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}
        >
          <span>{commitError}</span>
          <button onClick={() => setCommitError('')} className="opacity-60 hover:opacity-100">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
              <VersionTimeline projectId={id} onRollback={handleRollback} onPreview={handleVersionPreview} />
            </div>
          )}

          {/* Version preview banner */}
          {savedCode !== null && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg border"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <span className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                浏览历史版本
              </span>
              <button
                onClick={dismissPreview}
                className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                返回当前
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
