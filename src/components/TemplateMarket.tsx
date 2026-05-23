'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TEMPLATE_CATALOG } from '@/lib/templates/catalog';
import TemplateCard from './TemplateCard';
import TemplatePreviewModal from './TemplatePreviewModal';
import type { TemplateMeta } from '@/lib/templates/types';

const CATEGORIES = ['全部', ...Array.from(new Set(TEMPLATE_CATALOG.map(t => t.category)))];

type OriginFilter = 'all' | 'builtin' | 'open-source';

const ORIGIN_FILTERS = [
  { key: 'all' as const, label: '全部来源' },
  { key: 'builtin' as const, label: '内置' },
  { key: 'open-source' as const, label: '开源' },
];

export default function TemplateMarket() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateMeta | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => TEMPLATE_CATALOG.filter(t => {
    const type = t.origin?.type ?? 'builtin';
    const matchOrigin = originFilter === 'all' || type === originFilter;
    const matchCat = activeCategory === '全部' || t.category === activeCategory;
    const matchSearch = !search || t.name.includes(search) || t.description.includes(search) || (t.tags || []).some(tag => tag.includes(search));
    return matchOrigin && matchCat && matchSearch;
  }), [activeCategory, originFilter, search]);

  const handleSelect = async (template: TemplateMeta) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template.id, name: template.name }),
      });
      const data = await res.json();
      if (data.id) router.push(`/project/${data.id}`);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text-primary)' }}>
          从模板开始
        </h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--color-text-muted)' }}>
          选一个作为起点，然后用自然语言把它变成你想要的
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-2" role="tablist" aria-label="模板分类">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={activeCategory === cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all"
                  style={{
                    background: activeCategory === cat ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                    color: activeCategory === cat ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    border: activeCategory === cat ? '1px solid rgba(59,130,246,0.25)' : '1px solid var(--color-border)',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="w-px h-6 self-center rounded-full" style={{ background: 'var(--color-border)' }} />
            <div className="flex gap-1" role="radiogroup" aria-label="模板来源">
              {ORIGIN_FILTERS.map(f => (
                <button
                  key={f.key}
                  role="radio"
                  aria-checked={originFilter === f.key}
                  onClick={() => setOriginFilter(f.key)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all"
                  style={{
                    background: originFilter === f.key ? 'var(--color-accent-subtle)' : 'transparent',
                    color: originFilter === f.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="relative sm:ml-auto sm:w-52">
            <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-full pl-9 pr-3.5 py-2 text-[14px] outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t, i) => (
              <div key={t.id} style={{ animation: `fadeIn 400ms ease-out ${i * 60}ms both` }}>
                <TemplateCard template={t} onPreview={setPreviewTemplate} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[13px] mb-2" style={{ color: 'var(--color-text-muted)' }}>没有匹配的模板</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('全部'); setOriginFilter('all'); }}
              className="text-[12px] font-medium transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      <TemplatePreviewModal
        template={previewTemplate}
        open={!!previewTemplate}
        loading={loading}
        onClose={() => setPreviewTemplate(null)}
        onUse={handleSelect}
      />
    </div>
  );
}
