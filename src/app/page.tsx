'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BreathingGlow from '@/components/BreathingGlow';
import PillParticleShell from '@/components/PillParticleShell';
import { useSidebar } from '@/hooks/useSidebar';
import { useTheme } from '@/hooks/useTheme';

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { toggle } = useSidebar();
  const { theme, toggle: toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleCreate = async () => {
    if (loading || !input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: input.trim() || '未命名项目', from_scratch: true }),
      });
      const data = await res.json();
      if (data.id) router.push(`/project/${data.id}`);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) handleCreate();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <BreathingGlow />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-3" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--btn-glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--btn-glass-text)',
          }}
          aria-label="菜单"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
            style={{
              background: 'var(--btn-glass-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'var(--btn-glass-text)',
            }}
            aria-label="切换主题"
            suppressHydrationWarning
          >
            <span suppressHydrationWarning>
            {mounted ? (
              theme === 'dark' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" />
            )}
            </span>
          </button>
          <button
            onClick={() => router.push('/templates')}
            className="h-8 px-3.5 flex items-center gap-1.5 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-95"
            style={{
              background: 'var(--btn-glass-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: 'var(--btn-glass-text)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            模板
          </button>
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        {/* Greeting */}
        <h1
          className="entrance-greet text-center leading-tight tracking-tight"
          style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 'var(--greeting-weight)',
            color: 'var(--greeting-color)',
            letterSpacing: '-0.02em',
            marginBottom: 'clamp(32px, 5vw, 48px)',
          }}
        >
          想做点什么？
        </h1>
        <p
          className="text-center entrance-greet"
          style={{
            fontSize: 'clamp(13px, 2vw, 15px)',
            color: 'var(--color-text-muted)',
            marginTop: '-24px',
            marginBottom: 'clamp(28px, 4vw, 40px)',
            animationDelay: '60ms',
          }}
        >
          描述你想要的，或者从模板开始
        </p>

        {/* Pill input with particle shell */}
        <PillParticleShell className="entrance-input w-full flex justify-center">
          <div
            className="flex items-center rounded-full animate-input-breathe"
            style={{
              width: 'clamp(340px, 88vw, 700px)',
              height: 'clamp(64px, 9vw, 80px)',
              background: 'var(--pill-bg)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--input-border)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的功能..."
              disabled={loading}
              className="flex-1 bg-transparent pl-6 pr-4 text-[17px] disabled:opacity-30"
              style={{ color: 'var(--pill-text)' }}
            />
            <button
              onClick={() => input.trim() && handleCreate()}
              disabled={!input.trim() || loading}
              className="mr-2 w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-25 active:scale-90 shrink-0"
              style={{
                background: input.trim() ? 'var(--color-accent)' : 'var(--send-idle)',
                color: input.trim() ? '#fff' : 'var(--color-text-muted)',
              }}
              aria-label="发送"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </PillParticleShell>
      </div>
    </div>
  );
}
