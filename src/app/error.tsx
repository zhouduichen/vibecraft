'use client';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8" style={{ background: 'var(--color-app-bg)' }}>
      <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-muted)' }}>出错了</p>
      <p className="text-[12px] text-center max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        {error.message || '页面加载异常'}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="text-[12px] font-medium px-4 py-1.5 rounded-lg transition-colors"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          重试
        </button>
        <Link
          href="/"
          className="text-[12px] font-medium px-4 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
