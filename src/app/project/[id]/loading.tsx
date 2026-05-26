'use client';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function ProjectLoading() {
  return (
    <ErrorBoundary>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>加载中...</p>
        </div>
      </div>
    </ErrorBoundary>
  );
}
