import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8" style={{ background: 'var(--color-app-bg)' }}>
      <p className="text-[40px] font-bold" style={{ color: 'var(--color-text-muted)' }}>404</p>
      <p className="text-[14px]" style={{ color: 'var(--color-text-muted)' }}>页面不存在</p>
      <Link
        href="/"
        className="text-[12px] font-medium px-4 py-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--color-accent)' }}
      >
        返回首页
      </Link>
    </div>
  );
}
