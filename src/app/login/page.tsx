'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    signIn('github', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-[80vh] flex items-center">
      {/* Asymmetric layout: content anchored left, generous right space */}
      <div className="w-full max-w-4xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-5">
          {/* Main content — spans 3 of 5 columns */}
          <div className="lg:col-span-3 pt-12 lg:pt-20">
            {/* Headline */}
            <h1
              className="text-[2.75rem] lg:text-[3.5rem] leading-[1.05] font-bold tracking-tight mb-6"
              style={{
                color: 'var(--color-text-primary)',
                animation: 'fadeInSlow 600ms cubic-bezier(0.33, 0, 0.1, 1) 100ms both',
              }}
            >
              VibeCraft
            </h1>

            {/* Tagline */}
            <p
              className="text-[1.05rem] leading-relaxed max-w-xs mb-12"
              style={{
                color: 'var(--color-text-secondary)',
                animation: 'fadeInSlow 600ms cubic-bezier(0.33, 0, 0.1, 1) 200ms both',
              }}
            >
              选一个模板，用自然语言描述你想要的，<br />
              看着它变成真实的应用。
            </p>

            {/* Login button — crafted as a deliberate object */}
            <div
              style={{
                animation: 'fadeInSlow 600ms cubic-bezier(0.33, 0, 0.1, 1) 300ms both',
              }}
            >
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-[var(--radius-md)] text-[14px] font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <svg className="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                {loading ? '正在跳转...' : '使用 GitHub 登录'}
                <svg
                  className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Footer colophon */}
            <p
              className="mt-16 text-[12px]"
              style={{
                color: 'var(--color-text-muted)',
                opacity: 0.5,
                animation: 'fadeIn 800ms ease-out 600ms both',
              }}
            >
              不需要写一行代码
            </p>
          </div>

          {/* Right column — space */}
          <div className="hidden lg:block lg:col-span-2" />
        </div>
      </div>
    </div>
  );
}
