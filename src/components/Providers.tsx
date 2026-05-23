'use client';
import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/hooks/useSidebar';
import { ThemeProvider } from '@/hooks/useTheme';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/auth">
      <ThemeProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
