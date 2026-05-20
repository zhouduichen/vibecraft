'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

interface PreviewPaneProps {
  code: string;
  onRenderError: () => void;
  isStreaming: boolean;
}

export default function PreviewPane({ code, onRenderError, isStreaming }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [lastStableCode, setLastStableCode] = useState(code);

  useEffect(() => {
    if (!isStreaming) setLastStableCode(code);
  }, [code, isStreaming]);

  const displayCode = isStreaming ? lastStableCode : code;

  useEffect(() => {
    if (!iframeRef.current || !displayCode) return;

    const spyScript = `<script>window.onerror=function(m,s,l,c,e){window.parent.postMessage({type:'RENDER_ERROR',message:m,source:s,line:l},'*');return!1;};</script>`;
    const enhanced = displayCode.replace('<head>', `<head>${spyScript}`);

    try {
      setHasError(false);
      iframeRef.current.srcdoc = enhanced;
    } catch {
      // srcdoc assignment itself failed
      setHasError(true);
      onRenderError();
    }
  }, [displayCode, onRenderError]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'RENDER_ERROR') {
        console.error('Sandbox error:', event.data.message);
        setHasError(true);
        onRenderError();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onRenderError]);

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Streaming progress bar */}
      {isStreaming && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-10">
          <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse" />
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-20">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center text-2xl mb-4">
            !
          </div>
          <h3 className="text-lg font-bold text-white mb-1">AI 刚刚敲错了几个字母...</h3>
          <p className="text-sm text-slate-400 max-w-xs">
            代码在执行时发生崩溃。试试点击左侧版本快照一键撤回，或对 AI 说"检查你刚才写的代码，修复它"
          </p>
        </div>
      )}

      {!displayCode && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-600">预览区域</p>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="VibeCraft Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
      />
    </div>
  );
}
