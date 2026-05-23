'use client';
import { useState, useRef, useEffect } from 'react';
import { makeShareQrDataUrl } from '@/lib/qr';

interface ExportMenuProps {
  projectId: string;
}

export default function ExportMenu({ projectId }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [publishUrl, setPublishUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [hasPublished, setHasPublished] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    return () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); };
  }, []);

  const handleZip = async () => {
    setLoading('zip');
    setError('');
    try {
      const res = await fetch('/api/export/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('下载失败，请重试');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app.zip';
      a.click();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '网络异常，请重试'));
    } finally {
      setLoading(null);
    }
  };

  const handlePublish = async () => {
    setLoading('publish');
    setError('');
    try {
      const res = await fetch('/api/export/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '发布失败' })) as { error?: string };
        throw new Error(err.error || '发布失败，请重试');
      }
      const data = await res.json() as { url?: string };
      if (!data.url) throw new Error('发布链接获取失败');
      setPublishUrl(data.url);
      setQrUrl(await makeShareQrDataUrl(data.url));
      setPublished(true);
      setHasPublished(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '网络异常，请重试'));
    } finally {
      setLoading(null);
    }
  };

  const handleApk = () => {
    window.open('https://pwabuilder.com', '_blank');
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publishUrl);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setPublished(false); }}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-[12px] px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
      >
        发布应用
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-xl z-50 p-4"
          role={published ? undefined : 'menu'}
        >
          {published && publishUrl ? (
            /* ── 发布成功卡片 ── */
            <div>
              <div className="text-center mb-3">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  发布成功！
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
                  应用已上线，可通过以下方式分享
                </p>
              </div>

              <div className="text-center p-3 bg-[var(--color-base)] rounded-[var(--radius-lg)] mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI QR, next/Image can't optimize */}
                <img src={qrUrl} alt="分享二维码" className="w-32 h-32 mx-auto mb-3 rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="flex gap-1.5 mb-3">
                  <label htmlFor="publish-url-input" className="sr-only">分享链接</label>
                  <input
                    id="publish-url-input"
                    readOnly
                    value={publishUrl}
                    className="flex-1 text-[11px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] px-2.5 py-1.5 rounded-[var(--radius-sm)] outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={copyUrl}
                    className="text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[var(--color-text-muted)] text-center mb-3">或</p>

              <button
                onClick={handleZip}
                disabled={loading === 'zip'}
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">下载完整应用包</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  下载后可在桌面和手机安装使用
                </p>
              </button>
            </div>
          ) : (
            /* ── 三入口菜单 ── */
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">
                发布应用
              </h3>

              <button
                onClick={handleZip}
                disabled={loading === 'zip'}
                role="menuitem"
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">下载到电脑</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  打包为完整应用，解压后即可安装到桌面
                </p>
              </button>

              <button
                onClick={handlePublish}
                disabled={loading === 'publish'}
                role="menuitem"
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui mb-2 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{hasPublished ? '更新分享链接' : '生成分享链接'}</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  发布到线上，链接和二维码即可分享
                </p>
              </button>

              <button
                onClick={handleApk}
                role="menuitem"
                className="w-full text-left p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-border)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
              >
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">生成 APK</p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">
                  跳转 PWABuilder，上传 ZIP 后下载 APK
                </p>
              </button>
            </div>
          )}
          {error && (
            <p className="text-[12px] text-[var(--color-danger)] mt-2" role="alert">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
