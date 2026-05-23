'use client';
import { useState } from 'react';
import type { TemplateMeta } from '@/lib/templates/types';

interface Props {
  template: TemplateMeta;
  onPreview: (template: TemplateMeta) => void;
}

export default function TemplateCard({ template, onPreview }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={() => onPreview(template)}
      className="w-full text-left rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-px group"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
    >
      <div
        className="aspect-[4/3] flex items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--color-base)' }}
      >
        {template.cover_url && !imgError ? (
          // Template covers are local static previews; using a plain img avoids
          // requiring the Next image optimizer in standalone e2e/prod builds.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.cover_url}
            alt={template.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-4xl select-none">{template.icon}</span>
        )}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: 'radial-gradient(circle 200px at center, rgba(59,130,246,0.06), transparent)' }}
        />
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            {template.category}
          </span>
          {template.origin?.type === 'open-source' && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
            >
              开源模板
            </span>
          )}
          {template.origin?.license && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--color-base)', color: 'var(--color-text-muted)' }}
            >
              {template.origin.license}
            </span>
          )}
        </div>
        <h2 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {template.name}
        </h2>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {template.description}
        </p>
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {template.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--color-base)', color: 'var(--color-text-muted)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
