'use client';
import { useState, useRef, useEffect } from 'react';

interface ExportMenuProps {
  projectId: string;
  code: string;
}

export default function ExportMenu({ projectId, code }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [publishUrl, setPublishUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleZip = async () => {
    setLoading('zip');
    const res = await fetch('/api/export/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.zip';
    a.click();
    URL.revokeObjectURL(url);
    setLoading(null);
    setOpen(false);
  };

  const handlePublish = async () => {
    setLoading('publish');
    const res = await fetch('/api/export/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    setPublishUrl(data.url);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.url)}`);
    setLoading(null);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition font-medium"
      >
        导出
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-4">
          <h3 className="text-sm font-semibold text-white mb-3">导出应用</h3>

          <button onClick={handleZip} disabled={loading === 'zip'}
            className="w-full text-left p-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition mb-2 disabled:opacity-50">
            <p className="text-sm font-medium text-white">下载 ZIP 文件</p>
            <p className="text-xs text-slate-400 mt-0.5">下载后在任何浏览器打开即可使用</p>
          </button>

          <button onClick={handlePublish} disabled={loading === 'publish'}
            className="w-full text-left p-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition mb-3 disabled:opacity-50">
            <p className="text-sm font-medium text-white">生成分享链接</p>
            <p className="text-xs text-slate-400 mt-0.5">获取链接和二维码，手机扫码即可打开</p>
          </button>

          {qrUrl && publishUrl && (
            <div className="text-center p-3 bg-slate-900 rounded-xl">
              <img src={qrUrl} alt="QR Code" className="w-36 h-36 mx-auto mb-2 rounded-lg" />
              <p className="text-xs text-slate-400 mb-1">扫码或复制链接</p>
              <input readOnly value={publishUrl}
                className="w-full text-xs bg-slate-800 text-indigo-400 px-2 py-1.5 rounded-lg text-center outline-none"
                onFocus={e => e.target.select()} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
