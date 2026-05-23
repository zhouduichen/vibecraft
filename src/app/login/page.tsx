'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import BreathingGlow from '@/components/BreathingGlow';
import { useTheme } from '@/hooks/useTheme';
import { useSidebar } from '@/hooks/useSidebar';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();
  const { toggle: toggleSidebar } = useSidebar();

  const handleSignIn = () => {
    setLoading(true);
    signIn('github', { callbackUrl: '/' });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 px-6">
      <BreathingGlow />

      {/* Top bar: menu + theme */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95 md:hidden"
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
        <div className="flex-1" />
        <button
          onClick={toggle}
          className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-95"
          style={{
            background: 'var(--btn-glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--btn-glass-text)',
          }}
          aria-label="切换主题" suppressHydrationWarning
        >
          <span suppressHydrationWarning>
          {theme === 'dark' ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
          </span>
        </button>
      </div>

      {/* Star icon */}
      <div className="relative mb-6 flex items-center justify-center entrance-star" style={{ width: 64, height: 64 }}>
        <div className="flex items-center justify-center animate-breathe" style={{ width: 36, height: 36 }}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
            <defs>
              <linearGradient id="sparkle-grad-login" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#6a9aff" />
                <stop offset="50%" stopColor="#9e8cf0" />
                <stop offset="100%" stopColor="#e090d0" />
              </linearGradient>
            </defs>
            <path d="M20 4c-.55 0-1 .45-1 1v5.5c0 .55.45 1 1 1s1-.45 1-1V5c0-.55-.45-1-1-1zm0 24.5c-.55 0-1 .45-1 1V35c0 .55.45 1 1 1s1-.45 1-1v-5.5c0-.55-.45-1-1-1zM10.5 20c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1h5.5c.55 0 1-.45 1-1zm16 0c0-.55.45-1 1-1H36c.55 0 1 .45 1 1s-.45 1-1 1h-8.5c-.55 0-1-.45-1-1zM10.98 10.98a1 1 0 000 1.42l3.88 3.88a1 1 0 001.42-1.42l-3.88-3.88a1 1 0 00-1.42 0zm13.62 13.62a1 1 0 000 1.42l3.88 3.88a1 1 0 001.42-1.42l-3.88-3.88a1 1 0 00-1.42 0zm-13.62 0a1 1 0 011.42 0l3.88 3.88a1 1 0 01-1.42 1.42l-3.88-3.88a1 1 0 010-1.42zm13.62-13.62a1 1 0 011.42 0l3.88 3.88a1 1 0 11-1.42 1.42l-3.88-3.88a1 1 0 010-1.42z" fill="url(#sparkle-grad-login)" />
            <circle cx="20" cy="20" r="3.5" fill="url(#sparkle-grad-login)" />
          </svg>
        </div>
      </div>

      <h1
        className="entrance-greet text-center leading-tight tracking-tight mb-2"
        style={{
          fontSize: 'clamp(26px, 4.5vw, 40px)',
          fontWeight: 'var(--greeting-weight)',
          color: 'var(--greeting-color)',
          letterSpacing: '-0.02em',
        }}
      >
        VibeCraft
      </h1>
      <p
        className="text-center mb-12"
        style={{
          fontSize: 'clamp(14px, 2vw, 16px)',
          color: 'var(--color-text-muted)',
        }}
      >
        用自然语言创造你的应用
      </p>

      <div className="entrance-input">
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[15px] font-medium transition-all duration-200 active:scale-95 disabled:opacity-50"
          style={{
            background: 'var(--greeting-color)',
            color: 'var(--color-base)',
            boxShadow: '0 2px 20px rgba(0,0,0,0.15)',
          }}
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          {loading ? '正在跳转...' : '使用 GitHub 登录'}
        </button>
      </div>
    </div>
  );
}
