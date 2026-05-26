'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { VersionKind } from '@/lib/db';

interface VersionEntry {
  id: string;
  message: string;
  summary: string | null;
  kind: VersionKind;
  is_checkpoint: boolean;
  parent_version_id: string | null;
  created_at: string;
}

interface VersionTimelineProps {
  projectId: string;
  onRollback: (code: string) => void;
  onPreview?: (code: string) => void;
}

const KIND_CONFIG: Record<VersionKind, { label: string; icon: string; color: string }> = {
  ai_edit: { label: 'AI 修改', icon: '✦', color: 'var(--color-accent)' },
  manual: { label: '手动保存', icon: '✎', color: '#6366f1' },
  publish: { label: '发布', icon: '↑', color: '#16a34a' },
  rollback: { label: '回滚', icon: '↩', color: '#f97316' },
  repair: { label: '自动修复', icon: '⟳', color: '#8b5cf6' },
  checkpoint: { label: '标记', icon: '★', color: '#f59e0b' },
};

export default function VersionTimeline({ projectId, onRollback, onPreview }: VersionTimelineProps) {
  const router = useRouter();
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [namingVersion, setNamingVersion] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-dismiss errors
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(''), 6000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const fetchVersions = useCallback(() => {
    fetch(`/api/versions/${projectId}`)
      .then(r => r.json())
      .then(data => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const handleRollback = async (versionId: string) => {
    setActionLoading(versionId);
    try {
      const res = await fetch(`/api/versions/${projectId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.html_content) {
        onRollback(data.html_content);
        fetchVersions();
      } else {
        setErrorMsg(data.error || '回滚失败');
      }
    } catch { setErrorMsg('回滚失败，请重试'); } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = async (versionId: string) => {
    if (!onPreview) return;
    setActionLoading(`preview-${versionId}`);
    try {
      const res = await fetch(`/api/versions/${projectId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.html_content) onPreview(data.html_content);
      else setErrorMsg(data.error || '预览失败');
    } catch { setErrorMsg('预览失败，请重试'); } finally {
      setActionLoading(null);
    }
  };

  const handleSetCheckpoint = async (versionId: string) => {
    setActionLoading(`checkpoint-${versionId}`);
    try {
      await fetch(`/api/versions/${projectId}/checkpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      fetchVersions();
    } catch { setErrorMsg('标记失败'); } finally {
      setActionLoading(null);
    }
  };

  void handleSetCheckpoint;

  const handleNameCheckpoint = async (versionId: string) => {
    if (!nameInput.trim()) return;
    setActionLoading(`name-${versionId}`);
    try {
      await fetch(`/api/versions/${projectId}/checkpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, name: nameInput.trim() }),
      });
      setNamingVersion(null);
      setNameInput('');
      fetchVersions();
    } catch { setErrorMsg('命名失败'); } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicateVersion = async (versionId: string) => {
    setActionLoading(`dup-${versionId}`);
    try {
      const res = await fetch(`/api/versions/${projectId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (data.id) router.push(`/project/${data.id}`);
      else setErrorMsg(data.error || '分支创建失败');
    } catch { setErrorMsg('分支创建失败'); } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4" role="status" aria-label="加载版本历史">
        <div className="h-3 w-20 rounded mb-4" style={{ background: 'var(--color-border)' }} />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: 'var(--color-border)' }} />
              <div className="flex-1 space-y-2 rounded-lg p-3" style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)' }}>
                <div className="h-2 w-16 rounded" style={{ background: 'var(--color-border)' }} />
                <div className="h-2 w-full rounded" style={{ background: 'var(--color-border)' }} />
                <div className="h-2 w-3/4 rounded" style={{ background: 'var(--color-border)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-[13px] font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
        创作时间线
      </h2>
      {errorMsg && (
        <p className="text-[11px] mb-2 px-2 py-1 rounded" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}>
          {errorMsg}
        </p>
      )}
      {versions.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>暂无版本记录，开始编辑后会自动保存</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px" style={{ background: 'var(--color-border)' }} />

          <div className="space-y-2" role="list" aria-label="版本列表">
            {versions.map((v, i) => {
              const config = KIND_CONFIG[v.kind] || KIND_CONFIG.ai_edit;
              const isCurrent = i === 0;

              return (
                <div key={v.id} role="listitem" className="relative pl-7">
                  {/* Timeline dot */}
                  <div
                    className="absolute left-[5px] top-[10px] w-3.5 h-3.5 rounded-full flex items-center justify-center"
                    style={{
                      background: v.is_checkpoint ? '#f59e0b' : isCurrent ? 'var(--color-accent)' : 'var(--color-border)',
                    }}
                  >
                    {v.is_checkpoint ? (
                      <span className="text-[7px] text-white">★</span>
                    ) : (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isCurrent ? '#fff' : 'var(--color-base)',
                        }}
                      />
                    )}
                  </div>

                  <div
                    className="rounded-[var(--radius-md)] px-3 py-2"
                    style={{
                      background: v.is_checkpoint ? 'rgba(245,158,11,0.06)' : isCurrent ? 'var(--color-accent-subtle)' : 'var(--color-base)',
                      border: v.is_checkpoint ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
                    }}
                  >
                    {/* Header: kind badge + time */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] shrink-0">{config.icon}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{ background: `${config.color}15`, color: config.color }}
                        >
                          {config.label}
                        </span>
                        {v.is_checkpoint && (
                          <span className="text-[9px] font-medium" style={{ color: '#f59e0b' }}>★ 标记</span>
                        )}
                      </div>
                      <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(v.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Summary or message */}
                    {(v.summary || v.message) && (
                      <p className="text-[11px] leading-relaxed truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {v.summary || v.message}
                      </p>
                    )}

                    {/* Actions */}
                    {!isCurrent && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {onPreview && (
                          <button
                            onClick={() => handlePreview(v.id)}
                            disabled={actionLoading === `preview-${v.id}`}
                            className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors disabled:opacity-50"
                            style={{ color: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}
                          >
                            {actionLoading === `preview-${v.id}` ? '...' : '预览'}
                          </button>
                        )}
                        <button
                          onClick={() => handleRollback(v.id)}
                          disabled={actionLoading === v.id}
                          className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors disabled:opacity-50"
                          style={{ color: '#f97316', background: 'rgba(249,115,22,0.1)' }}
                        >
                          {actionLoading === v.id ? '...' : '恢复'}
                        </button>
                        {namingVersion === v.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              value={nameInput}
                              onChange={e => setNameInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleNameCheckpoint(v.id);
                                if (e.key === 'Escape') { setNamingVersion(null); setNameInput(''); }
                              }}
                              placeholder="标记名称..."
                              className="w-20 h-5 text-[10px] px-1.5 rounded border outline-none"
                              style={{ background: 'var(--color-base)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setNamingVersion(v.id); setNameInput(''); }}
                            className="text-[10px] px-2 py-0.5 rounded font-medium"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            标记
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateVersion(v.id)}
                          disabled={actionLoading === `dup-${v.id}`}
                          className="text-[10px] px-2 py-0.5 rounded font-medium disabled:opacity-50"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {actionLoading === `dup-${v.id}` ? '...' : '分支'}
                        </button>
                      </div>
                    )}

                    {isCurrent && (
                      <span className="text-[10px] font-medium mt-1 block" style={{ color: 'var(--color-accent)' }}>
                        当前版本
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
