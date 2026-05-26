'use client';
import { useState, useRef, useEffect } from 'react';
import { makeShareQrDataUrl } from '@/lib/qr';

interface SharePanelProps {
  projectId: string;
}

/**
 * Minimal HTML validation: checks for structural integrity
 * without rendering. Catches empty or clearly broken output.
 */
function validateGeneratedHtml(html: string): string | null {
  if (!html || html.trim().length < 50) return '生成内容为空或不完整';
  if (!/<!DOCTYPE/i.test(html) && !/<html/i.test(html)) return '缺少 HTML 文档结构';
  if (!/<\/html>/i.test(html)) return 'HTML 文档不完整';
  return null;
}

type PanelView = 'menu' | 'publish_form' | 'published_detail' | 'settings';

export default function SharePanel({ projectId }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [publishUrl, setPublishUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const [publishTitle, setPublishTitle] = useState('');
  const [publishDesc, setPublishDesc] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted'>('public');
  const [view, setView] = useState<PanelView>('menu');
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

  // Fetch publish status when opening
  useEffect(() => {
    if (!open) return;
    fetch(`/api/export/publish/status?projectId=${projectId}`)
      .then(r => r.json())
      .then(data => {
        if (data.published) {
          setPublishUrl(`${window.location.origin}/app/${data.slug}`);
          setPublishTitle(data.title || '');
          setPublishDesc(data.description || '');
          setVisibility(data.visibility || 'public');
          setIsOutdated(data.is_outdated || false);
          setPublished(true);
          setView('published_detail');
        } else {
          setPublished(false);
          setIsOutdated(false);
          setPublishUrl('');
          setView('menu');
        }
      })
      .catch(() => {});
  }, [open, projectId]);

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

    // Pre-publish validation
    try {
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const project = await projectRes.json();
      if (project.current_html) {
        const validationError = validateGeneratedHtml(project.current_html);
        if (validationError) {
          setError(`发布前检查：${validationError}。请先修复后再发布。`);
          setLoading(null);
          return;
        }
      }
    } catch {
      // Continue anyway if validation fetch fails
    }

    try {
      const body: Record<string, unknown> = { projectId, visibility };
      if (publishTitle.trim()) body.title = publishTitle.trim();
      if (publishDesc.trim()) body.description = publishDesc.trim();

      const res = await fetch('/api/export/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '发布失败' })) as { error?: string };
        throw new Error(err.error || '发布失败，请重试');
      }
      const data = await res.json() as { url?: string };
      if (!data.url) throw new Error('发布链接获取失败');
      setPublishUrl(data.url);
      setQrUrl(await makeShareQrDataUrl(data.url));
      setIsOutdated(false);
      setPublished(true);
      setView('published_detail');
    } catch (err: unknown) {
      setError(getErrorMessage(err, '网络异常，请重试'));
    } finally {
      setLoading(null);
    }
  };

  const handleRevoke = async () => {
    if (!confirm('确定撤回分享？已发布的链接将无法访问，且重新发布会生成新链接。')) return;
    setLoading('revoke');
    setError('');
    try {
      const res = await fetch('/api/export/publish/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error('撤回失败');
      setPublished(false);
      setIsOutdated(false);
      setPublishUrl('');
      setView('menu');
    } catch (err: unknown) {
      setError(getErrorMessage(err, '网络异常，请重试'));
    } finally {
      setLoading(null);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(publishUrl);
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const triggerButtonLabel = published
    ? isOutdated ? '有未发布更新' : '已发布'
    : '发布应用';

  const triggerButtonStyle = published
    ? isOutdated
      ? { background: 'rgba(251,146,60,0.15)', color: '#f97316' }
      : { background: 'rgba(34,197,94,0.15)', color: '#16a34a' }
    : { background: 'var(--color-accent)', color: '#fff' };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => { setOpen(v => !v); }}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-[12px] px-3 py-1.5 rounded-[var(--radius-sm)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 font-medium flex items-center gap-1.5"
        style={triggerButtonStyle}
      >
        {published && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {triggerButtonLabel}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-xl z-50 p-4"
        >
          {view === 'published_detail' && (
            /* ── Published detail view ── */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: isOutdated ? '#f97316' : '#16a34a' }} />
                <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {isOutdated ? '有未发布修改' : '已发布'}
                </p>
                {isOutdated && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-auto" style={{ background: 'rgba(251,146,60,0.12)', color: '#f97316' }}>
                    需要更新
                  </span>
                )}
              </div>

              {publishTitle && (
                <p className="text-[14px] font-medium mb-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {publishTitle}
                </p>
              )}

              <div className="flex gap-1.5 mb-3">
                <input
                  id="publish-url-input"
                  readOnly
                  value={publishUrl}
                  className="flex-1 text-[11px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] px-2.5 py-1.5 rounded-[var(--radius-sm)] outline-none"
                  onFocus={e => e.target.select()}
                />
                <button
                  onClick={copyUrl}
                  className="text-[11px] px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-ui shrink-0"
                >
                  {copied ? '已复制' : '复制'}
                </button>
              </div>

              {/* QR code */}
              <div className="text-center p-3 bg-[var(--color-base)] rounded-[var(--radius-lg)] mb-3">
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="分享二维码" className="w-28 h-28 mx-auto rounded-lg" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <button
                    onClick={async () => setQrUrl(await makeShareQrDataUrl(publishUrl))}
                    className="text-[11px] px-3 py-1.5 rounded-full font-medium"
                    style={{ color: 'var(--color-accent)', background: 'var(--color-accent-subtle)' }}
                  >
                    生成二维码
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setView('settings')}
                  className="flex-1 text-[11px] py-2 rounded-[var(--radius-sm)] font-medium transition-colors"
                  style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-secondary)' }}
                >
                  修改设置
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={loading === 'revoke'}
                  className="flex-1 text-[11px] py-2 rounded-[var(--radius-sm)] font-medium transition-colors disabled:opacity-50"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.08)' }}
                >
                  {loading === 'revoke' ? '...' : '撤回分享'}
                </button>
              </div>

              <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={handleZip}
                  disabled={loading === 'zip'}
                  className="w-full text-left p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-border)] transition-ui disabled:opacity-50"
                >
                  <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>下载完整应用包</p>
                </button>
                <button
                  onClick={() => window.open('https://pwabuilder.com', '_blank')}
                  className="w-full text-left p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-border)] transition-ui"
                >
                  <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>生成 APK</p>
                </button>
              </div>
            </div>
          )}

          {view === 'settings' && (
            /* ── Settings view ── */
            <div>
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                发布设置
              </h3>
              <div className="space-y-2.5 mb-3">
                <input
                  type="text"
                  value={publishTitle}
                  onChange={e => setPublishTitle(e.target.value)}
                  placeholder="分享标题（选填）"
                  className="w-full h-8 px-3 text-[12px] rounded-[var(--radius-sm)] outline-none transition-colors"
                  style={{ background: 'var(--color-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
                />
                <textarea
                  value={publishDesc}
                  onChange={e => setPublishDesc(e.target.value)}
                  placeholder="分享描述（选填）"
                  rows={2}
                  className="w-full px-3 py-1.5 text-[12px] rounded-[var(--radius-sm)] outline-none transition-colors resize-none"
                  style={{ background: 'var(--color-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
                />
              </div>
              <button
                onClick={handlePublish}
                disabled={loading === 'publish'}
                className="w-full py-2 text-[12px] font-medium rounded-[var(--radius-sm)] transition-all disabled:opacity-50 active:scale-[0.98] mb-2"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {loading === 'publish' ? '保存中...' : '保存设置'}
              </button>
              <button
                onClick={() => setView('published_detail')}
                className="w-full text-[12px] py-1.5 text-center rounded-[var(--radius-sm)]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ← 返回
              </button>
            </div>
          )}

          {view === 'menu' && (
            /* ── Main menu ── */
            <div>
              <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                分享与导出
              </h3>

              {/* Title & description for new publish */}
              <div className="space-y-2.5 mb-3">
                <input
                  type="text"
                  value={publishTitle}
                  onChange={e => setPublishTitle(e.target.value)}
                  placeholder="分享标题（选填）"
                  className="w-full h-8 px-3 text-[12px] rounded-[var(--radius-sm)] outline-none transition-colors"
                  style={{ background: 'var(--color-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
                />
                <textarea
                  value={publishDesc}
                  onChange={e => setPublishDesc(e.target.value)}
                  placeholder="分享描述（选填）"
                  rows={2}
                  className="w-full px-3 py-1.5 text-[12px] rounded-[var(--radius-sm)] outline-none transition-colors resize-none"
                  style={{ background: 'var(--color-base)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; }}
                />
                {/* Visibility toggle */}
                <div className="flex items-center gap-2 px-1">
                  <button
                    onClick={() => setVisibility(v => v === 'public' ? 'unlisted' : 'public')}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors"
                    style={{
                      background: visibility === 'public' ? 'rgba(34,197,94,0.1)' : 'var(--color-base)',
                      color: visibility === 'public' ? '#16a34a' : 'var(--color-text-muted)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {visibility === 'public' ? (
                        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      ) : (
                        <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></>
                      )}
                    </svg>
                    {visibility === 'public' ? '公开' : '不列出'}
                  </button>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    {visibility === 'public' ? '所有人可见' : '仅知道链接的人可访问'}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={loading === 'publish'}
                className="w-full py-2 text-[12px] font-medium rounded-[var(--radius-sm)] transition-all disabled:opacity-50 active:scale-[0.98] mb-2"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                {loading === 'publish' ? '发布中...' : '发布到线上'}
              </button>

              <div className="border-t my-2" style={{ borderColor: 'var(--color-border)' }} />

              <button
                onClick={handleZip}
                disabled={loading === 'zip'}
                className="w-full text-left p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-border)] transition-ui disabled:opacity-50"
              >
                <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>下载到电脑</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>打包为 PWA 应用，可离线使用</p>
              </button>

              <button
                onClick={() => window.open('https://pwabuilder.com', '_blank')}
                className="w-full text-left p-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-border)] transition-ui"
              >
                <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-primary)' }}>生成 APK</p>
                <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>跳转 PWABuilder 制作安卓安装包</p>
              </button>
            </div>
          )}

          {error && (
            <p className="text-[12px] text-red-500 mt-2" role="alert">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
