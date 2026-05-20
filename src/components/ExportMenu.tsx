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
  const [copied, setCopied] = useState(false);
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
    a.href = url; a.download = 'app.zip'; a.click();
    URL.revokeObjectURL(url);
    setLoading(null); setOpen(false);
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

  const copyUrl = () => {
    navigator.clipboard.writeText(publishUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-[12px] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui"
      >
        导出
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-xl z-50 p-4">
          <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">导出应用</h3>

          <button onClick={handleZip} disabled={loading === 'zip'}
            className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50">
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">下载 ZIP 文件</p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">下载后在任何浏览器打开即可使用</p>
          </button>

          <button onClick={handlePublish} disabled={loading === 'publish'}
            className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-3 disabled:opacity-50">
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">生成分享链接</p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">获取链接和二维码，手机扫码即可打开</p>
          </button>

          {qrUrl && publishUrl && (
            <div className="text-center p-3 bg-[var(--color-base)] rounded-[var(--radius-lg)]">
              <img src={qrUrl} alt="QR Code" className="w-32 h-32 mx-auto mb-3 rounded-lg" />
              <p className="text-[12px] text-[var(--color-text-muted)] mb-2">扫码或复制链接分享</p>
              <div className="flex gap-1.5">
                <input readOnly value={publishUrl}
                  className="flex-1 text-[11px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] px-2.5 py-1.5 rounded-[var(--radius-sm)] outline-none"
                  onFocus={e => e.target.select()} />
                <button onClick={copyUrl}
                  className="text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui shrink-0">
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
