'use client';
import { useEffect, useState } from 'react';

interface VersionEntry {
  id: string;
  message: string;
  created_at: string;
}

interface VersionTimelineProps {
  projectId: string;
  onRollback: (code: string) => void;
}

export default function VersionTimeline({ projectId, onRollback }: VersionTimelineProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/versions/${projectId}`)
      .then(r => r.json())
      .then(data => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleRollback = async (versionId: string) => {
    setRollingBack(versionId);
    const res = await fetch(`/api/versions/${projectId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId }),
    });
    const data = await res.json();
    if (data.html_content) onRollback(data.html_content);
    setRollingBack(null);
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center" role="status" aria-label="加载版本历史">
        <div className="w-4 h-4 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-3">版本历史</h2>
      {versions.length === 0 ? (
        <p className="text-[12px] text-[var(--color-text-muted)]">暂无版本记录</p>
      ) : (
        <div className="space-y-1.5" role="list" aria-label="版本列表">
          {versions.map((v, i) => (
            <div key={v.id} role="listitem" className="rounded-[var(--radius-md)] bg-[var(--color-base)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {new Date(v.created_at).toLocaleString('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                </span>
                {i === 0 ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium">当前</span>
                ) : (
                  <button
                    onClick={() => handleRollback(v.id)}
                    disabled={rollingBack === v.id}
                    aria-label={`回退到 ${new Date(v.created_at).toLocaleString('zh-CN')} 的版本`}
                    className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-ui disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2">
                    {rollingBack === v.id ? '...' : '回退'}
                  </button>
                )}
              </div>
              <p className="text-[12px] text-[var(--color-text-secondary)] truncate">{v.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
