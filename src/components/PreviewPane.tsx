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
  const [lastStableCode, setLastStableCode] = useState(code);
  const onRenderErrorRef = useRef(onRenderError);
  onRenderErrorRef.current = onRenderError;

  useEffect(() => {
    if (!isStreaming) setLastStableCode(code);
  }, [code, isStreaming]);

  const displayCode = isStreaming ? lastStableCode : code;

  useEffect(() => {
    if (!iframeRef.current || !displayCode) return;
    const spyScript = `<script>window.onerror=function(m,s,l,c,e){window.parent.postMessage({type:'RENDER_ERROR',message:m,source:s,line:l},'*');return false;};</script>`;
    const enhanced = displayCode.replace(/<head>/i, `<head>${spyScript}`);
    try {
      setHasError(false);
      iframeRef.current.srcdoc = enhanced;
    } catch {
      setHasError(true);
      onRenderErrorRef.current();
    }
  }, [displayCode]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'RENDER_ERROR') {
        setHasError(true);
        onRenderErrorRef.current();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <div className="w-full h-full relative p-4" style={{ background: 'var(--color-base)' }}>
      {/* Inner frame: gives the preview a subtle "paper edge" */}
      <div
        className="w-full h-full rounded-[var(--radius-lg)] overflow-hidden relative"
        style={{
          border: '1px solid var(--color-border)',
          background: '#fafafa',
          boxShadow: '0 0 0 1px var(--color-border)',
        }}
      >
        {/* Streaming indicator bar */}
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

        {/* Error overlay */}
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
            <p className="text-[12px] text-[var(--color-text-secondary)] max-w-xs leading-relaxed">
              代码运行时报错。回退到上一个版本，或者重新描述需求让 AI 再试一次
            </p>
          </div>
        )}

        {/* Empty state */}
        {!displayCode && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#fafafa' }}>
            <p className="text-[13px]" style={{ color: '#999' }}>预览区域</p>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="应用预览"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
