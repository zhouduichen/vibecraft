import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'VibeCraft',
  description: 'Create your own apps with natural language',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-full flex flex-col">
        <Providers>
          <nav className="h-12 bg-slate-900 border-b border-slate-700/50 flex items-center px-4 gap-4 shrink-0">
            <a href="/" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition">
              VibeCraft
            </a>
            <a href="/dashboard" className="text-sm text-slate-400 hover:text-white transition">
              项目
            </a>
            <a href="/" className="text-sm text-slate-400 hover:text-white transition">
              模板
            </a>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
