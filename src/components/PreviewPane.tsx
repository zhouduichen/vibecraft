'use client';
import { useEffect, useRef, useState } from 'react';

interface PreviewPaneProps {
  code: string;
  onRenderError: () => void;
  isStreaming: boolean;
}

export default function PreviewPane({ code, onRenderError, isStreaming }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const onRenderErrorRef = useRef(onRenderError);
  const errorFlagRef = useRef(false);

  useEffect(() => {
    onRenderErrorRef.current = onRenderError;
  }, [onRenderError]);

  useEffect(() => {
    if (!iframeRef.current || !code) return;
    errorFlagRef.current = false;
    setHasError(false);
    setErrorDetail('');
    // Robust: matches <head>, <head lang="...">, <HEAD data-x>, etc.
    const spyScript = `<script>window.onerror=function(m,s,l,c,e){var msg=m||'';if(e&&e.stack)msg+='\\n'+String(e.stack).split('\\n').slice(0,3).join('\\n');window.parent.postMessage({type:'RENDER_ERROR',message:msg,source:s||'',line:l||0},'*');return false;};</script>`;
    const enhanced = code.replace(/<head\b[^>]*>/i, `$&${spyScript}`);
    iframeRef.current.srcdoc = enhanced;
  }, [code]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === 'RENDER_ERROR') {
        errorFlagRef.current = true;
        setHasError(true);
        setErrorDetail(event.data.message || '未知错误');
        onRenderErrorRef.current();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleIframeLoad = () => {
    if (!errorFlagRef.current) {
      setHasError(false);
      setErrorDetail('');
    }
  };

  return (
    <div className="w-full h-full relative p-4" style={{ background: 'var(--color-base)' }}>
      <div
        className="w-full h-full rounded-[var(--radius-lg)] overflow-hidden relative"
        style={{
          border: '1px solid var(--color-border)',
          background: '#fafafa',
          boxShadow: '0 0 0 1px var(--color-border)',
        }}
      >
        {isStreaming && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-10" role="progressbar" aria-label="AI 正在生成代码">
            <div
              className="h-full"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
                animation: 'shimmer 1.5s ease-in-out infinite',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        )}

        {hasError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20"
            style={{ background: 'rgba(12, 13, 15, 0.95)' }}
            role="alert"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg mb-3"
              style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}
              aria-hidden="true"
            >
              !
            </div>
            <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">预览出错了</h2>
            <p className="text-[12px] text-[var(--color-text-secondary)] max-w-xs leading-relaxed mb-3">
              代码运行时报错。回退到上一个版本，或者重新描述需求让 AI 再试一次
            </p>
            {errorDetail && (
              <details className="text-left w-full max-w-sm">
                <summary className="text-[11px] text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]">
                  查看错误详情
                </summary>
                <pre className="mt-2 p-3 rounded-[var(--radius-md)] text-[11px] leading-relaxed overflow-auto max-h-40 whitespace-pre-wrap"
                  style={{ background: 'var(--color-base)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>
        )}

        {!code && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#fafafa' }}>
            <p className="text-[13px]" style={{ color: '#999' }}>预览区域</p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="应用预览"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
