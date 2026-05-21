'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PreviewPane from '@/components/PreviewPane';
import ChatPanel from '@/components/ChatPanel';
import VersionTimeline from '@/components/VersionTimeline';
import ExportMenu from '@/components/ExportMenu';
import BalanceBar from '@/components/BalanceBar';
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

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => { if (data.error) { router.push('/'); return; } setProject(data); setCurrentCode(data.current_html); setDesignProfile(data.design_profile || null); })
      .catch(() => { setFetchError(true); });
  }, [id, router]);

  const handleCodeUpdate = useCallback((code: string) => { setCurrentCode(code); }, []);
  const handleRollback = useCallback((code: string) => { setCurrentCode(code); }, []);

  if (fetchError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-[var(--color-text-secondary)]">加载失败</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
        >
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
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Header */}
      <header
        className="h-12 flex items-center justify-between px-5 shrink-0 border-b relative z-10"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors shrink-0 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <span className="w-px h-4" style={{ background: 'var(--color-border)' }} />
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">
              {project.name}
            </h1>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
              style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
            >
              {project.template_id === 'ledger' ? '记账' : project.template_id === 'todo' ? 'Todo' : '打卡'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BalanceBar />
          <button
            onClick={() => setShowVersions(v => !v)}
            aria-pressed={showVersions}
            className="text-[12px] px-2.5 py-1.5 rounded-[var(--radius-sm)] font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
            style={
              showVersions
                ? { background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }
                : { color: 'var(--color-text-muted)' }
            }
          >
            版本历史
          </button>
          <ExportMenu projectId={id} />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Chat sidebar */}
        <div
          className="w-[320px] lg:w-[360px] flex flex-col shrink-0 border-r"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
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
          />
        </div>

        {/* Preview */}
        <div className="flex-1 flex min-w-0">
          <div className="flex-1">
            <PreviewPane
              code={currentCode}
              onRenderError={() => {}}
              isStreaming={isStreaming}
            />
          </div>

          {/* Version timeline panel */}
          {showVersions && (
            <div
              className="w-64 overflow-y-auto shrink-0 scrollbar-thin border-l"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <VersionTimeline projectId={id} onRollback={handleRollback} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
