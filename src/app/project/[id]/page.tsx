'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PreviewPane from '@/components/PreviewPane';
import ChatPanel from '@/components/ChatPanel';
import VersionTimeline from '@/components/VersionTimeline';
import ExportMenu from '@/components/ExportMenu';
import BalanceBar from '@/components/BalanceBar';
import type { Project } from '@/lib/db';

export default function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (data.error) { router.push('/'); return; } setProject(data); setCurrentCode(data.current_html); })
      .catch(() => { setFetchError(true); });
  }, [id, router]);

  const handleCodeUpdate = useCallback((code: string) => { setCurrentCode(code); }, []);
  const handleRollback = useCallback((code: string) => { setCurrentCode(code); }, []);

  if (fetchError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-[14px] text-[var(--color-text-secondary)]">加载失败</p>
        <button onClick={() => router.push('/dashboard')} className="text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-ui">
          ← 返回项目列表
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2.75rem)] flex flex-col">
      <header className="h-11 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-ui shrink-0">
            ← 返回
          </button>
          <span className="w-px h-4 bg-[var(--color-border)]" />
          <h1 className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <BalanceBar />
          <button onClick={() => setShowVersions(v => !v)}
            aria-pressed={showVersions}
            className={"text-[12px] px-2.5 py-1.5 rounded-[var(--radius-sm)] font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 " +
              (showVersions ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]')}>
            版本历史
          </button>
          <ExportMenu projectId={id} code={currentCode} />
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="w-[320px] lg:w-[360px] border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0">
          <ChatPanel
            projectId={id}
            templateId={project.template_id}
            selectedSkills={project.selected_skills || []}
            onCodeUpdate={handleCodeUpdate}
            onStreamStart={() => setIsStreaming(true)}
            onStreamEnd={() => setIsStreaming(false)}
          />
        </div>

        <div className="flex-1 flex min-w-0">
          <div className="flex-1">
            <PreviewPane
              code={currentCode}
              onRenderError={() => {}}
              isStreaming={isStreaming}
            />
          </div>
          {showVersions && (
            <div className="w-64 border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto shrink-0 scrollbar-thin">
              <VersionTimeline projectId={id} onRollback={handleRollback} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
