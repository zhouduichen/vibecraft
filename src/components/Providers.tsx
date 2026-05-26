'use client';
import { SessionProvider } from 'next-auth/react';
import { SidebarProvider } from '@/hooks/useSidebar';
import { ThemeProvider } from '@/hooks/useTheme';
import ErrorBoundary from './ErrorBoundary';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/auth">
      <ThemeProvider>
        <SidebarProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
