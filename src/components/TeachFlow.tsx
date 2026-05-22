'use client';
import { useState } from 'react';
import { QUESTIONS, DEFAULT_ANSWERS, type TeachAnswer } from '@/config/design/questions';
import { RECIPES } from '@/config/design/recipes';
import { mapAnswersToProfile } from '@/config/design/mapper';
import type { DesignProfile } from '@/lib/db';

interface TeachFlowProps {
  projectId: string;
  onComplete: (profile: DesignProfile) => void;
  onSkip: () => void;
}

type Mode = 'options' | 'custom-input';

export default function TeachFlow({ projectId, onComplete, onSkip }: TeachFlowProps) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [answers, setAnswers] = useState<TeachAnswer[]>([]);
  const [mode, setMode] = useState<Mode>('options');
  const [customText, setCustomText] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const currentQuestion = QUESTIONS[roundIndex];
  if (!currentQuestion) {
    // All rounds done — show final view
    const profile = mapAnswersToProfile(answers);
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          <h2 className="text-[13px] font-medium text-[var(--color-text-secondary)]">设计调校</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6" role="status">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'var(--color-accent-subtle)' }}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" style={{ color: 'var(--color-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            )}
          </div>
          <p className="text-[13px] font-medium text-[var(--color-text-primary)] mb-1">
            设计语言已就绪
          </p>
          <p className="text-[12px] text-[var(--color-text-muted)] max-w-[220px] leading-relaxed mb-4">
            你可以随时通过「设计增强」菜单重新设定
          </p>
          <button
            onClick={async () => {
              setSaving(true);
              await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ design_profile: profile }),
              });
              onComplete(profile);
            }}
            disabled={saving}
            className="px-5 py-2 rounded-[var(--radius-md)] text-[13px] font-medium bg-[var(--color-accent)] text-white disabled:opacity-50 transition-all"
          >
            {saving ? '保存中...' : '开始创作'}
          </button>
        </div>
      </div>
    );
  }

  const isRecipeRound = currentQuestion.id === 'recipe';

  const handleOptionSelect = (optionId: string) => {
    const answer: TeachAnswer = { questionId: currentQuestion.id, selectedOptionId: optionId };
    const next = [...answers, answer];
    setAnswers(next);
    if (roundIndex >= QUESTIONS.length - 1) {
      finishWithAnswers(next);
    } else {
      setRoundIndex(i => i + 1);
    }
  };

  const handleCustomSubmit = () => {
    if (!customText.trim()) return;
    const answer: TeachAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: '__custom__',
      customText: customText.trim(),
    };
    const next = [...answers, answer];
    setAnswers(next);
    setCustomText('');
    setMode('options');
    if (roundIndex >= QUESTIONS.length - 1) {
      finishWithAnswers(next);
    } else {
      setRoundIndex(i => i + 1);
    }
  };

  const handleSkip = () => {
    const answer: TeachAnswer = {
      questionId: currentQuestion.id,
      selectedOptionId: DEFAULT_ANSWERS[currentQuestion.id] || currentQuestion.options[0].id,
    };
    const next = [...answers, answer];
    setAnswers(next);
    if (roundIndex >= QUESTIONS.length - 1) {
      finishWithAnswers(next);
    } else {
      setRoundIndex(i => i + 1);
    }
  };

  const handleFinish = () => {
    finishWithAnswers(answers);
  };

  const finishWithAnswers = async (finalAnswers: TeachAnswer[]) => {
    setSaving(true);
    setErrorMsg('');
    try {
      const profile = mapAnswersToProfile(finalAnswers);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_profile: profile }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '保存失败' }));
        setErrorMsg(err.error || '保存设计配置失败，请重试');
        setSaving(false);
        return;
      }
      onComplete(profile);
    } catch {
      setErrorMsg('网络异常，请重试');
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
          <h2 className="text-[13px] font-medium text-[var(--color-text-secondary)]">设计调校</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {roundIndex + 1}/{QUESTIONS.length}
          </span>
          <button
            onClick={onSkip}
            className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] px-2 py-0.5 rounded transition-colors"
          >
            退出
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite" aria-label="设计调校对话">
        {/* Error message */}
        {errorMsg && (
          <div className="flex justify-start animate-[fadeIn_200ms_ease-out_both]">
            <div
              className="max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] leading-relaxed"
              style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}
              role="alert"
            >
              {errorMsg}
            </div>
          </div>
        )}

        {/* System message */}
        <div className="flex justify-start animate-[fadeIn_300ms_ease-out_both]">
          <div
            className="max-w-[88%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] leading-relaxed"
            style={{ background: 'var(--color-base)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >
            <p className="font-medium text-[var(--color-text-primary)]">{currentQuestion.text}</p>
          </div>
        </div>

        {mode === 'options' ? (
          <>
            {isRecipeRound ? (
              <div className="grid grid-cols-1 gap-2">
                {RECIPES.map(recipe => (
                  <button
                    key={recipe.id}
                    onClick={() => handleOptionSelect(recipe.id)}
                    className="text-left p-3 rounded-lg transition-all duration-200 text-[12px] leading-relaxed focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 hover:border-[var(--color-accent)]"
                    style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)' }}
                  >
                    <span className="font-medium text-[var(--color-text-primary)]">{recipe.name}</span>
                    <span className="text-[var(--color-text-muted)] ml-2">{recipe.description}</span>
                  </button>
                ))}
                <button
                  onClick={() => setMode('custom-input')}
                  className="text-left p-3 rounded-lg transition-all duration-200 text-[12px] leading-relaxed focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                  style={{ background: 'var(--color-base)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  这三套都不太对，我想要...
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {currentQuestion.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(opt.id)}
                    className="w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 hover:border-[var(--color-accent)]"
                    style={{ background: 'var(--color-base)', border: '1px solid var(--color-border)' }}
                  >
                    <span className="text-[13px] font-medium text-[var(--color-text-primary)] block">{opt.label}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">{opt.description}</span>
                  </button>
                ))}
                <button
                  onClick={() => setMode('custom-input')}
                  className="w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-[12px] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                  style={{ background: 'var(--color-base)', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  ✎ 都不是，我想说...
                </button>
              </div>
            )}

            {/* Exit row */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSkip}
                className="text-[11px] px-2 py-1 rounded transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                跳过此问
              </button>
              <span className="text-[11px]" style={{ color: 'var(--color-border)' }}>|</span>
              <button
                onClick={handleFinish}
                className="text-[11px] px-2 py-1 rounded transition-colors text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              >
                就这些了，开始吧 →
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2 animate-[fadeIn_200ms_ease-out_both]">
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="用你自己的话描述..."
              rows={3}
              className="w-full bg-[var(--color-base)] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={!customText.trim()}
                className="text-[12px] px-3 py-1.5 rounded font-medium bg-[var(--color-accent)] text-white disabled:opacity-40 transition-all"
              >
                确定
              </button>
              <button
                onClick={() => { setCustomText(''); setMode('options'); }}
                className="text-[12px] px-3 py-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                返回选项
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
