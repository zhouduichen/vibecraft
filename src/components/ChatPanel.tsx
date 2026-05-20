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

  const isValid = input.trim().length >= 5 &&
    !/^[\s\p{P}]+$/u.test(input);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.trim().length > 0 && val.trim().length < 5) {
      setValidationMsg('请具体描述你想改动哪里，比如："把标题改成红色"');
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
              if (!(e instanceof SyntaxError)) {
                console.error('Unexpected error parsing SSE:', e);
              }
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-700/50">
        <h2 className="text-sm font-semibold text-slate-300">对话</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {codeChunks.length === 0 && !isLoading && (
          <p className="text-sm text-slate-500 text-center py-8">
            在下方输入你想对应用做的修改，比如"添加一个搜索框"或"把背景改成深色模式"
          </p>
        )}
        {codeChunks.map((chunk, i) => (
          <div key={`${i}-${chunk.slice(0, 8)}`} className="bg-slate-800 rounded-lg p-3">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">{chunk}</pre>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
            <span className="ml-1">AI 正在修改代码...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <SkillSelector projectId={projectId} templateId={templateId} initialSkills={selectedSkills} />

      <div className="p-3 border-t border-slate-700/50">
        {validationMsg && (
          <p className="text-xs text-amber-400 mb-2">{validationMsg}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="描述你想要的功能或改动..."
            rows={2}
            disabled={isLoading}
            className="flex-1 bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-indigo-500 resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isValid || isLoading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium text-sm transition self-end disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
