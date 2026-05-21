'use client';
import { useState, useMemo } from 'react';
import { TEMPLATES } from '@/config/templates';
import TemplateCard from './TemplateCard';

const CATEGORIES = ['全部', '记账', '日程', '打卡'];

export default function TemplateMarket() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => TEMPLATES.filter(t => {
    const matchCat = activeCategory === '全部' || t.category === activeCategory;
    const matchSearch = !search || t.name.includes(search) || t.description.includes(search) || t.tags.some(tag => tag.includes(search));
    return matchCat && matchSearch;
  }), [activeCategory, search]);

  return (
    <div>
      {/* Hero */}
      <div className="pt-20 pb-6 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-[2.5rem] lg:text-[3rem] leading-[1.08] font-bold tracking-tight text-[var(--color-text-primary)] mb-4">
            从这些开始
          </h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] max-w-md leading-relaxed">
            每个模板都是一个完整的应用。选一个，然后用自然语言把它变成你想要的。
          </p>
        </div>
      </div>

      {/* Search + nav — quiet, integrated */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
          {/* Categories — text links with underline indicator */}
          <div className="flex gap-5" role="tablist" aria-label="模板分类">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className="relative text-[13px] py-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 rounded-sm"
                style={{
                  color: activeCategory === cat ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  fontWeight: activeCategory === cat ? 500 : 400,
                }}
              >
                {cat}
                {activeCategory === cat && (
                  <span
                    className="absolute -bottom-[5px] left-0 right-0 h-[2px] rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Search — subtle */}
          <div className="relative sm:ml-auto sm:w-56">
            <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <label htmlFor="template-search" className="sr-only">搜索模板</label>
            <input
              id="template-search"
              type="text"
              placeholder="搜索..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-[var(--radius-md)] pl-9 pr-3.5 py-2 text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-all duration-200"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            />
          </div>
        </div>
      </div>

      {/* Template grid — varied rhythm */}
      <div className="max-w-5xl mx-auto px-4 pb-24">
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t, i) => (
              <div
                key={t.id}
                style={{
                  animation: `fadeIn 450ms ease-out ${i * 70}ms both`,
                }}
                className={
                  i === 0 && activeCategory === '全部' && !search
                    ? 'lg:col-span-2 lg:row-span-1'
                    : ''
                }
              >
                <TemplateCard
                  template={t}
                  featured={i === 0 && activeCategory === '全部' && !search}
                />
              </div>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-[15px] text-[var(--color-text-secondary)] mb-1">
              没有匹配的模板
            </p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('全部'); }}
              className="text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors mt-2"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
