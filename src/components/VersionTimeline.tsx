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

  useEffect(() => {
    fetch(`/api/versions/${projectId}`)
      .then(r => r.json())
      .then(data => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleRollback = async (versionId: string) => {
    const res = await fetch(`/api/versions/${projectId}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ versionId }),
    });
    const data = await res.json();
    if (data.html_content) onRollback(data.html_content);
  };

  if (loading) {
    return <div className="p-4 text-sm text-slate-500">加载中...</div>;
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">版本历史</h3>
      {versions.length === 0 ? (
        <p className="text-xs text-slate-500">暂无版本记录</p>
      ) : (
        <div className="space-y-2">
          {versions.map((v, i) => (
            <div key={v.id} className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">
                {new Date(v.created_at).toLocaleString('zh-CN')}
              </p>
              <p className="text-xs text-slate-300 mb-2 line-clamp-2">{v.message}</p>
              {i > 0 && (
                <button onClick={() => handleRollback(v.id)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                  回退到此版本
                </button>
              )}
              {i === 0 && <span className="text-xs text-slate-600">当前版本</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
