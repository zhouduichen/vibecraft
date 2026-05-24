'use client';
import type { Suggestion } from '@/config/manifests/types';

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  onSelect: (text: string) => void;
  loading?: boolean;
}

const CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
  content: { bg: 'var(--color-accent-subtle)', color: 'var(--color-accent)' },
  skill: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  design: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
  fix: { bg: 'var(--color-danger-subtle)', color: 'var(--color-danger)' },
};

export default function SuggestionChips({ suggestions, onSelect, loading }: SuggestionChipsProps) {
  if (suggestions.length === 0 || loading) return null;

  return (
    <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
      {suggestions.map((s, i) => {
        const style = CATEGORY_STYLES[s.category] || CATEGORY_STYLES.content;
        return (
          <button
            key={i}
            onClick={() => onSelect(s.text)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all hover:opacity-80"
            style={{
              background: style.bg,
              color: style.color,
            }}
          >
            {s.text}
          </button>
        );
      })}
    </div>
  );
}
