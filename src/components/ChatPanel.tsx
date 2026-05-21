'use client';
import { useState, useRef, useEffect } from 'react';
import SkillSelector from './SkillSelector';
import DesignEnhancementToggle from './DesignEnhancementToggle';
import TeachFlow from './TeachFlow';
import type { DesignProfile } from '@/lib/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  status: 'ok' | 'error';
}

interface ChatPanelProps {
  projectId: string;
  templateId: string;
  selectedSkills: string[];
  onCodeUpdate: (code: string) => void;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  designProfile: DesignProfile | null;
  onDesignProfileChange: (profile: DesignProfile | null) => void;
}

const INITIAL_STEP = '正在理解你的需求...';

export default function ChatPanel({
  projectId, templateId, selectedSkills, onCodeUpdate, onStreamStart, onStreamEnd,
  designProfile,
  onDesignProfileChange,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [validationMsg, setValidationMsg] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [teachMode, setTeachMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentStep]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const isValid = input.trim().length >= 5 && !/^[\s\p{P}]+$/u.test(input);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.trim().length > 0 && val.trim().length < 5) {
      setValidationMsg('可以再具体一点吗？比如"把标题改成红色"');
    } else if (val.trim().length > 0 && /^[\s\p{P}]+$/u.test(val)) {
      setValidationMsg('请输入有意义的描述');
    } else {
      setValidationMsg('');
    }
  };

  const handleSend = async () => {
    if (!isValid || isLoading) return;
    const demand = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: demand, status: 'ok' }]);
    setInput('');
    setIsLoading(true);
    setCurrentStep(INITIAL_STEP);
    onStreamStart();

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userDemand: demand, selectedSkills }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        setMessages(prev => [...prev, { role: 'assistant', content: err.error || '请求失败，请重试', status: 'error' }]);
        setCurrentStep('');
        setIsLoading(false);
        onStreamEnd();
        return;
      }

      const body = res.body;
      if (!body) {
        setMessages(prev => [...prev, { role: 'assistant', content: '服务无响应，请重试', status: 'error' }]);
        setCurrentStep('');
        setIsLoading(false);
        onStreamEnd();
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotCode = false;

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
              if (data.type === 'step') {
                setCurrentStep(data.step === 'done' ? '' : data.detail || data.step);
                if (data.step === 'done') {
                  setMessages(prev => [...prev, { role: 'assistant', content: data.detail || '修改完成，请在右侧预览查看效果', status: 'ok' }]);
                }
              } else if (data.type === 'code') {
                onCodeUpdate(data.content);
                gotCode = true;
              } else if (data.type === 'error') {
                setMessages(prev => [...prev, { role: 'assistant', content: data.message, status: 'error' }]);
                setCurrentStep('');
              }
            } catch (e) {
              if (!(e instanceof SyntaxError)) console.error('SSE parse error:', e);
            }
          }
        }
      }

      if (!gotCode && currentStep) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'AI 未返回有效结果，请换个说法再试一次', status: 'error' }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: '网络异常，请检查连接后重试', status: 'error' }]);
    }
    setCurrentStep('');
    setIsLoading(false);
    onStreamEnd();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <h2 className="text-[13px] font-medium text-[var(--color-text-secondary)]">对话</h2>
      </div>

      {teachMode ? (
        <TeachFlow
          projectId={projectId}
          onComplete={(profile: DesignProfile) => {
            onDesignProfileChange(profile);
            setTeachMode(false);
          }}
          onSkip={() => {
            onDesignProfileChange(null);
            setTeachMode(false);
          }}
        />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin" role="log" aria-live="polite" aria-label="AI 对话">
            {messages.length === 0 && !isLoading && (
              <div className="text-center pt-12">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'var(--color-accent-subtle)' }}
                  aria-hidden="true"
                >
                  <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  告诉我你想怎么改
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed max-w-[220px] mx-auto">
                  试试"把背景色换成浅色"或"在顶部加一个导航栏"
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_300ms_ease-out_both]`}>
                <div
                  className="max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={
                    msg.role === 'user'
                      ? { background: 'var(--color-accent)', color: '#ffffff' }
                      : msg.status === 'error'
                        ? { background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }
                        : { background: 'var(--color-base)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Step indicator */}
            {currentStep && (
              <div className="flex justify-start animate-[fadeIn_200ms_ease-out_both]">
                <div
                  className="max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] leading-relaxed flex items-center gap-2"
                  style={{ background: 'var(--color-base)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >
                  {currentStep === INITIAL_STEP ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-accent)', animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-accent)', animationDelay: '120ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--color-accent)', animationDelay: '240ms' }} />
                    </>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
                  )}
                  <span>{currentStep}</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <SkillSelector projectId={projectId} templateId={templateId} initialSkills={selectedSkills} />

          {/* Design enhancement toggle */}
          <div className="px-4 pb-1.5 flex items-center gap-2">
            <DesignEnhancementToggle
              enabled={!!designProfile}
              hasProfile={!!designProfile}
              onToggle={(next) => {
                if (next && !designProfile) {
                  setTeachMode(true);
                } else if (!next) {
                  onDesignProfileChange(null);
                  fetch(`/api/projects/${projectId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ design_profile: null }),
                  }).catch(console.error);
                }
              }}
              onReset={() => setTeachMode(true)}
            />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-[var(--color-border)]">
            {validationMsg && (
              <p className="text-[12px] mb-2" style={{ color: 'var(--color-warning)' }} role="alert">{validationMsg}</p>
            )}
            <div className="flex gap-2">
              <label htmlFor="chat-input" className="sr-only">描述你想要的功能或改动</label>
              <textarea
                id="chat-input"
                ref={textareaRef}
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
                className="px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-200 self-end focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 active:scale-[0.97]"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
