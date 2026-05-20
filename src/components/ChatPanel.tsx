'use client';
import { useState, useRef, useEffect } from 'react';
import SkillSelector from './SkillSelector';

interface ChatPanelProps {
  projectId: string;
  templateId: string;
  selectedSkills: string[];
  onCodeUpdate: (code: string) => void;
  onStreamStart: () => void;
  onStreamEnd: () => void;
}

export default function ChatPanel({
  projectId, templateId, selectedSkills, onCodeUpdate, onStreamStart, onStreamEnd
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeChunks, setCodeChunks] = useState<string[]>([]);
  const [validationMsg, setValidationMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [codeChunks]);

  const isValid = input.trim().length >= 5 && !/^[\s\p{P}]+$/u.test(input);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.trim().length > 0 && val.trim().length < 5) {
      setValidationMsg('请再具体一点，比如"把标题改成红色"');
    } else if (val.trim().length > 0 && /^[\s\p{P}]+$/u.test(val)) {
      setValidationMsg('请输入有意义的描述');
    } else {
      setValidationMsg('');
    }
  };

  const handleSend = async () => {
    if (!isValid || isLoading) return;
    setIsLoading(true);
    setCodeChunks([]);
    onStreamStart();

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userDemand: input.trim(), selectedSkills }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        setCodeChunks([`Error: ${err.error || 'Request failed'}`]);
        setIsLoading(false);
        onStreamEnd();
        return;
      }

      const body = res.body;
      if (!body) {
        setCodeChunks(['Error: No response body']);
        setIsLoading(false);
        onStreamEnd();
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const data = JSON.parse(payload);
              if (data.type === 'chunk') {
                setCodeChunks(prev => [...prev, data.content]);
              } else if (data.type === 'code') {
                onCodeUpdate(data.content);
                setInput('');
              } else if (data.type === 'error') {
                setCodeChunks(prev => [...prev, `Error: ${data.message}`]);
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) console.error('SSE parse error:', e);
            }
          }
        }
      }
    } catch (e: any) {
      setCodeChunks(prev => [...prev, `Network error: ${e?.message || String(e)}`]);
    }
    setIsLoading(false);
    onStreamEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-[13px] font-medium text-[var(--color-text-secondary)]">对话</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-thin" role="log" aria-live="polite" aria-label="AI 对话内容">
        {codeChunks.length === 0 && !isLoading && (
          <div className="text-center py-10">
            <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
              告诉我你想怎么改这个应用
            </p>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-1 opacity-60">
              比如"添加一个搜索框"或"把背景改成深色"
            </p>
          </div>
        )}
        {codeChunks.map((chunk, i) => (
          <div key={`${i}-${chunk.slice(0, 8)}`} className="bg-[var(--color-base)] rounded-[var(--radius-md)] px-3.5 py-2.5">
            <pre className="text-[12px] text-[var(--color-text-secondary)] font-mono whitespace-pre-wrap break-all leading-relaxed">{chunk}</pre>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-[12px] py-1.5" role="status" aria-label="AI 正在生成代码">
            <span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
            <span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full animate-bounce" style={{animationDelay:'120ms'}} />
            <span className="w-1.5 h-1.5 bg-[var(--color-accent)] rounded-full animate-bounce" style={{animationDelay:'240ms'}} />
            <span className="ml-1.5">AI 正在修改...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <SkillSelector projectId={projectId} templateId={templateId} initialSkills={selectedSkills} />

      <div className="p-3 border-t border-[var(--color-border)]">
        {validationMsg && (
          <p className="text-[12px] text-[var(--color-warning)] mb-2" role="alert">{validationMsg}</p>
        )}
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">描述你想要的功能或改动</label>
          <textarea
            id="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="描述你想要的功能或改动..."
            rows={2}
            disabled={isLoading}
            className="flex-1 bg-[var(--color-base)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 outline-none resize-none disabled:opacity-50 transition-ui"
          />
          <button
            onClick={handleSend}
            disabled={!isValid || isLoading}
            className="px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-surface-raised)] disabled:text-[var(--color-text-muted)] text-white rounded-[var(--radius-md)] text-[13px] font-medium transition-ui self-end disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
          >
            {isLoading ? '...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
