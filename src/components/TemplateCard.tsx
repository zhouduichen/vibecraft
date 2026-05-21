'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTiltCard } from '@/lib/useMouse';
import type { Template } from '@/config/templates';

export default function TemplateCard({ template, featured }: { template: Template; featured?: boolean }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  useTiltCard(cardRef);

  const handleUse = async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: template.id, name: template.name }),
    });
    const data = await res.json();
    if (data.id) router.push(`/project/${data.id}`);
  };

  return (
    <div ref={cardRef} className="tilt-card group">
      <div
        className="tilt-card__inner rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] overflow-hidden cursor-pointer relative"
        style={{
          transform: 'rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))',
          boxShadow: 'var(--tilt-x, 0) var(--tilt-y, 0) 0 0 transparent',
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          e.currentTarget.style.setProperty('--glow-x', `${x}px`);
          e.currentTarget.style.setProperty('--glow-y', `${y}px`);
        }}
      >
        {/* Preview area */}
        <div
          className={featured ? 'aspect-[16/10]' : 'aspect-[4/3]'}
          style={{ background: 'var(--color-base)' }}
        >
          <div className="w-full h-full flex items-center justify-center relative">
            <div
              className="absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-60"
              style={{
                background: 'radial-gradient(circle 300px at var(--glow-x, 50%) var(--glow-y, 50%), rgba(108,114,240,0.12), transparent)',
              }}
            />
            <span className="relative text-6xl select-none">{template.icon}</span>
          </div>
        </div>

        {/* Content */}
        <div className={featured ? 'p-5' : 'p-4'}>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium">
              {template.category}
            </span>
          </div>
          <h2 className={featured ? 'text-lg font-semibold' : 'text-[15px] font-semibold'} style={{ color: 'var(--color-text-primary)' }}>
            {template.name}
          </h2>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1 mb-3 leading-relaxed">
            {template.description}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {template.tags.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-base)] text-[var(--color-text-muted)]">
                {tag}
              </span>
            ))}
          </div>
          <button
            onClick={handleUse}
            className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 active:scale-[0.98]"
          >
            从此开始
          </button>
        </div>
      </div>
    </div>
  );
}
