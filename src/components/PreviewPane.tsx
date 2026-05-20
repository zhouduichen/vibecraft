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
    <div className="w-full h-full relative bg-[var(--color-base)]">
      {isStreaming && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-10" role="progressbar" aria-label="AI 正在生成代码">
          <div className="h-full bg-[var(--color-accent)] animate-pulse" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 bg-[var(--color-base)]/95 flex flex-col items-center justify-center text-center p-6 z-20" role="alert">
          <div className="w-12 h-12 rounded-full bg-[var(--color-danger-subtle)] flex items-center justify-center text-[var(--color-danger)] text-lg mb-3" aria-hidden="true">
            !
          </div>
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">AI 刚才出错了</h2>
          <p className="text-[12px] text-[var(--color-text-secondary)] max-w-xs leading-relaxed">
            代码运行时报错。试试点击顶部"版本历史"回退到上一个版本，或重新描述需求让 AI 再试一次。
          </p>
        </div>
      )}

      {!displayCode && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[13px] text-[var(--color-text-muted)]">预览区域</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="应用预览"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
      />
    </div>
  );
}
