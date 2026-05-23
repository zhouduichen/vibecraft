'use client';
import type { TemplateMeta } from '@/lib/templates/types';

interface Props {
  template: TemplateMeta | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onUse: (template: TemplateMeta) => void;
}

export default function TemplatePreviewModal({ template, open, loading, onClose, onUse }: Props) {
  if (!open || !template) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-[15px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                {template.name}
              </h2>
              {template.origin?.type === 'open-source' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                  开源模板
                </span>
              )}
              {template.origin?.license && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: 'var(--color-base)', color: 'var(--color-text-muted)' }}>
                  {template.origin.license}
                </span>
              )}
            </div>
            <p className="text-[12px] truncate" style={{ color: 'var(--color-text-muted)' }}>{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Iframe preview */}
        <div className="flex-1 min-h-0 bg-white">
          <iframe
            src={`/api/templates/${template.id}/preview`}
            sandbox="allow-scripts allow-forms allow-popups"
            className="w-full h-full border-0"
            style={{ minHeight: 400 }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mr-auto">
              {template.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-base)', color: 'var(--color-text-muted)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
          >
            取消
          </button>
          <button
            onClick={() => onUse(template)}
            disabled={loading}
            className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
          >
            {loading ? '创建中...' : '使用模板'}
          </button>
        </div>
      </div>
    </div>
  );
}
