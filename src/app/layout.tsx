import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import Sidebar from '@/components/Sidebar';
import SWRegister from '@/components/SWRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'VibeCraft - 用自然语言创造应用',
  description: '描述你想要的，看着它变成真实的应用。',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <body className="h-full flex">
        <Providers>
          <SWRegister />
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 relative">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
