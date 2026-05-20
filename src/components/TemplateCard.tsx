'use client';
import { useRouter } from 'next/navigation';
import type { Template } from '@/config/templates';

export default function TemplateCard({ template }: { template: Template }) {
  const router = useRouter();

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
    <div className="group rounded-[var(--radius-xl)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-ui overflow-hidden">
      <div className="aspect-[4/3] bg-[var(--color-base)] flex items-center justify-center text-5xl relative overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-surface)]" />
        <span className="relative z-10">{template.icon}</span>
      </div>
      <div className="p-4 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-medium">
            {template.category}
          </span>
        </div>
        <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-0.5">{template.name}</h2>
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-3 leading-relaxed">{template.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {template.tags.map(tag => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]">
              {tag}
            </span>
          ))}
        </div>
        <button onClick={handleUse}
          className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[var(--radius-md)] text-[13px] font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2">
          从此开始
        </button>
      </div>
    </div>
  );
}
