'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import SkillSelector from './SkillSelector';
import DesignEnhancementToggle from './DesignEnhancementToggle';
import TeachFlow from './TeachFlow';
import EditableSlotsPanel from './EditableSlotsPanel';
import { getManifest } from '@/config/manifests';
import type { DesignProfile } from '@/lib/db';

let msgIdCounter = 0;

interface Message {
  id: number;
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
  onDraftReady: (code: string, demand: string) => void;
  onDraftError: (errorMessage: string) => void;
}

const INITIAL_STEP = '正在理解你的需求...';

export default function ChatPanel({
  projectId, templateId, selectedSkills, onCodeUpdate, onStreamStart, onStreamEnd,
  designProfile, onDesignProfileChange, onDraftReady, onDraftError,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [validationMsg, setValidationMsg] = useState('');
  const [currentStep, setCurrentStep] = useState('');
  const [teachMode, setTeachMode] = useState(false);
  const [activeSkills, setActiveSkills] = useState<string[]>(selectedSkills);
  const manifest = templateId ? getManifest(templateId) : null;
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastDemandRef = useRef('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentStep]);

  useEffect(() => {
    if (!isLoading && textareaRef.current) textareaRef.current.focus();
  }, [isLoading]);

  const isValid = input.trim().length >= 5 && !/^[\s\p{P}]+$/u.test(input);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (val.trim().length > 0 && val.trim().length < 5) {
      setValidationMsg('可以再具体一点吗？');
    } else if (val.trim().length > 0 && /^[\s\p{P}]+$/u.test(val)) {
      setValidationMsg('请输入有意义的描述');
    } else {
      setValidationMsg('');
    }
  };

  const handleDeleteMessage = useCallback((id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleSend = async () => {
    if (!isValid || isLoading) return;
    const demand = input.trim();
    lastDemandRef.current = demand;
    const userMsgId = ++msgIdCounter;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: demand, status: 'ok' }]);
    setInput('');
    setIsLoading(true);
    setCurrentStep(INITIAL_STEP);
    onStreamStart();

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userDemand: demand, selectedSkills: activeSkills }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: err.error || '请求失败，请重试', status: 'error' }]);
        setCurrentStep('');
        setIsLoading(false);
        onStreamEnd();
        return;
      }

      const body = res.body;
      if (!body) {
        setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: '服务无响应，请重试', status: 'error' }]);
        setCurrentStep('');
        setIsLoading(false);
        onStreamEnd();
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotCode = false;
      let gotError = false;

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
              const data = JSON.parse(payload) as {
                type?: 'step' | 'code' | 'error';
                step?: string;
                detail?: string;
                content?: string;
                message?: string;
              };
              if (data.type === 'step') {
                setCurrentStep(data.step === 'done' ? '' : data.detail || data.step || '');
                if (data.step === 'done') {
                  setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: data.detail || '修改完成', status: 'ok' }]);
                }
              } else if (data.type === 'code') {
                onCodeUpdate(data.content || '');
                onDraftReady(data.content || '', lastDemandRef.current);
                gotCode = true;
              } else if (data.type === 'error') {
                gotError = true;
                onDraftError(data.message || '');
                setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: data.message || '请求失败', status: 'error' }]);
                setCurrentStep('');
              }
            } catch {}
          }
        }
      }

      if (!gotCode && !gotError) {
        setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: 'AI 未返回有效结果，请换个说法再试一次', status: 'error' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: ++msgIdCounter, role: 'assistant', content: '网络异常，请重试', status: 'error' }]);
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
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
        <h2 className="text-[14px] font-medium" style={{ color: 'var(--color-text-muted)' }}>对话</h2>
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
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin" role="log" aria-live="polite">
            {messages.length === 0 && !isLoading && (
              <div className="text-center pt-12">
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>告诉我你想怎么改</p>
                <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  试试「把标题变大」或「加个饼图」
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex group ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animation: 'fadeIn 250ms ease-out both' }}>
                <div className="relative max-w-[92%]">
                  <div
                    className="rounded-lg px-3 py-2 text-[14px] leading-relaxed"
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
                  <button
                    onClick={() => handleDeleteMessage(msg.id)}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center"
                    style={{ width: 20, height: 20, background: 'var(--color-surface)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    title="删除消息"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {currentStep && (
              <div className="flex" style={{ animation: 'fadeIn 200ms ease-out both' }}>
                <div
                  className="max-w-[92%] rounded-lg px-3 py-2 text-[14px] flex items-center gap-2"
                  style={{ background: 'var(--color-base)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                >
                  {currentStep === INITIAL_STEP ? (
                    <>
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-accent)', animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-accent)', animationDelay: '120ms' }} />
                      <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--color-accent)', animationDelay: '240ms' }} />
                    </>
                  ) : (
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-accent)' }} />
                  )}
                  <span>{currentStep}</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <SkillSelector projectId={projectId} templateId={templateId} selectedSkills={activeSkills} onChange={setActiveSkills} />

          <div className="px-3 pb-1">
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

          {manifest && manifest.editableSlots.length > 0 && (
            <EditableSlotsPanel
              manifestSlots={manifest.editableSlots}
              onRequestEdit={(slotId, value) => {
                const slot = manifest.editableSlots.find(s => s.id === slotId);
                if (slot) {
                  setInput(`修改「${slot.label}」为：${value}`);
                  textareaRef.current?.focus();
                }
              }}
              onRequestAiEdit={(prompt) => {
                setInput(prompt);
                textareaRef.current?.focus();
              }}
            />
          )}

          <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {validationMsg && (
              <p className="text-[12px] mb-1.5" style={{ color: 'var(--color-warning)' }} role="alert">{validationMsg}</p>
            )}
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="描述改动..."
                rows={2}
                disabled={isLoading}
                className="flex-1 rounded-lg px-3 py-2 text-[14px] outline-none resize-none disabled:opacity-50 transition-ui"
                style={{
                  background: 'var(--color-base)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              <button
                onClick={handleSend}
                disabled={!isValid || isLoading}
                className="px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-200 self-end disabled:opacity-40 active:scale-[0.97]"
                style={{ background: 'var(--color-accent)', color: '#ffffff' }}
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
