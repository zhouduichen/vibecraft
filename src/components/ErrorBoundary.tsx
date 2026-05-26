'use client';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <p className="text-[13px] font-medium" style={{ color: 'var(--color-text-muted)' }}>页面出现异常</p>
          <p className="text-[12px] text-center max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="text-[12px] font-medium px-4 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
