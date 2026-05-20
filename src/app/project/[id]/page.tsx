'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PreviewPane from '@/components/PreviewPane';
import ChatPanel from '@/components/ChatPanel';
import VersionTimeline from '@/components/VersionTimeline';
import ExportMenu from '@/components/ExportMenu';
import BalanceBar from '@/components/BalanceBar';

export default function ProjectEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [currentCode, setCurrentCode] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/'); return; }
        setProject(data);
        setCurrentCode(data.current_html);
      });
  }, [id, router]);

  const handleCodeUpdate = useCallback((code: string) => {
    setCurrentCode(code);
  }, []);

  const handleRenderError = useCallback(() => {
    setErrorCount(c => c + 1);
  }, []);

  const handleRollback = useCallback((code: string) => {
    setCurrentCode(code);
  }, []);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      {/* Top bar */}
      <header className="h-12 bg-slate-900 border-b border-slate-700/50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white text-sm">
            ← 返回
          </button>
          <span className="text-slate-600">|</span>
          <h1 className="text-sm font-medium text-white">{project.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <BalanceBar />
          <button onClick={() => setShowVersions(v => !v)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
            {showVersions ? '隐藏' : '版本历史'}
          </button>
          <ExportMenu projectId={id} code={currentCode} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chat panel */}
        <div className="w-[35%] min-w-[360px] border-r border-slate-700/50 bg-slate-900 flex flex-col">
          <ChatPanel
            projectId={id}
            templateId={project.template_id}
            selectedSkills={project.selected_skills || []}
            onCodeUpdate={handleCodeUpdate}
            onStreamStart={() => setIsStreaming(true)}
            onStreamEnd={() => setIsStreaming(false)}
          />
        </div>

        {/* Right: Preview + optional version timeline */}
        <div className="flex-1 flex">
          <div className="flex-1">
            <PreviewPane
              code={currentCode}
              onRenderError={handleRenderError}
              isStreaming={isStreaming}
            />
          </div>
          {showVersions && (
            <div className="w-72 border-l border-slate-700/50 bg-slate-900 overflow-y-auto">
              <VersionTimeline projectId={id} onRollback={handleRollback} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
