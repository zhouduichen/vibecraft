import type { Metadata } from 'next';
import Link from 'next/link';
import Providers from '@/components/Providers';
import MouseGlow from '@/components/MouseGlow';
import SWRegister from '@/components/SWRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'VibeCraft — 用自然语言创造应用',
  description: '选一个模板，描述你想要的，得到一个能用的应用。',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full flex flex-col relative">
        <MouseGlow />
        <Providers>
          <SWRegister />
          <nav className="h-12 flex items-center px-6 gap-6 shrink-0 border-b border-[var(--color-border)] relative z-10" aria-label="主导航">
            <Link href="/" className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] hover:text-white transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 rounded-sm">
              VibeCraft
            </Link>
            <div className="flex gap-0.5">
              <Link href="/" className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2">
                模板
              </Link>
              <Link href="/dashboard" className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2">
                项目
              </Link>
            </div>
          </nav>
          <div className="relative z-10 flex-1 flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
