'use client';
import { useEffect, useRef, useState } from 'react';
import { STORAGE_SHIM } from '@/lib/generated/storage-shim';
import { SLOT_BRIDGE_SCRIPT } from '@/lib/ai/slot-bridge';

interface PreviewPaneProps {
  code: string;
  onRenderError: () => void;
  onRenderReady?: () => void;
  isStreaming: boolean;
}

export default function PreviewPane({ code, onRenderError, onRenderReady, isStreaming }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const onRenderErrorRef = useRef(onRenderError);
  const onRenderReadyRef = useRef(onRenderReady);
  const errorFlagRef = useRef(false);

  useEffect(() => { onRenderErrorRef.current = onRenderError; }, [onRenderError]);
  useEffect(() => { onRenderReadyRef.current = onRenderReady; }, [onRenderReady]);

  useEffect(() => {
    if (!iframeRef.current || !code) return;
    errorFlagRef.current = false;
    setHasError(false);
    setErrorDetail('');
    const spyScript = `<script>window.onerror=function(m,s,l,c,e){var msg=m||'';if(e&&e.stack)msg+='\\n'+String(e.stack).split('\\n').slice(0,3).join('\\n');window.parent.postMessage({type:'RENDER_ERROR',message:msg,source:s||'',line:l||0},'*');return false;};</script>`;
    const enhanced = code
      .replace(/<head\b[^>]*>/i, `$&${STORAGE_SHIM}${spyScript}`)
      .replace('</head>', `${SLOT_BRIDGE_SCRIPT}</head>`);
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
      if (event.data?.type === 'RENDER_READY') {
        onRenderReadyRef.current?.();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleIframeLoad = () => {
    if (!errorFlagRef.current) { setHasError(false); setErrorDetail(''); }
  };

  return (
    <div className="w-full h-full relative p-3" style={{ background: 'var(--color-base)' }}>
      <div
        className="w-full h-full rounded-xl overflow-hidden relative"
        style={{ background: '#fafafa', border: '1px solid var(--color-border)' }}
      >
        {isStreaming && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-10" role="progressbar" aria-label="AI 正在生成">
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
            style={{ background: 'var(--color-base)', backdropFilter: 'blur(12px)' }}
            role="alert"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm mb-3"
              style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}
            >
              !
            </div>
            <h2 className="text-[12px] font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>预览出错了</h2>
            <p className="text-[11px] max-w-xs leading-relaxed mb-3" style={{ color: 'var(--color-text-muted)' }}>
              代码运行时报错。回退到上一个版本，或重新描述需求让 AI 再试一次
            </p>
            {errorDetail && (
              <details className="text-left w-full max-w-sm">
                <summary className="text-[10px] cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>查看错误详情</summary>
                <pre
                  className="mt-2 p-3 rounded-lg text-[10px] leading-relaxed overflow-auto max-h-36 whitespace-pre-wrap"
                  style={{ background: 'var(--color-base)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
                >
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>
        )}

        {!code && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#fafafa' }}>
            <p className="text-[12px]" style={{ color: '#999' }}>预览区域</p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="应用预览"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
