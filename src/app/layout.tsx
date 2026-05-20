import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'VibeCraft — Create apps with words',
  description: 'Pick a template, describe what you want, and get a working app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col">
        <Providers>
          <nav className="h-11 flex items-center px-5 gap-5 shrink-0 border-b border-[var(--color-border)]" aria-label="主导航">
            <a href="/" className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)] hover:text-white transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 rounded-sm">
              VibeCraft
            </a>
            <div className="flex gap-1">
              <a href="/" className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2">
                模板
              </a>
              <a href="/dashboard" className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2">
                项目
              </a>
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
