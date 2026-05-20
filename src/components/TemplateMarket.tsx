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
      <div className="text-center mb-10">
        <h1 className="text-[2rem] font-bold tracking-tight text-[var(--color-text-primary)] mb-3">
          选择一个起点
        </h1>
        <p className="text-[15px] text-[var(--color-text-secondary)] max-w-sm mx-auto leading-relaxed">
          从模板开始，用自然语言改造成你想要的应用
        </p>
      </div>

      <div className="max-w-md mx-auto mb-6">
        <div className="relative">
          <svg aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <label htmlFor="template-search" className="sr-only">搜索模板</label>
          <input id="template-search" type="text" placeholder="记账、打卡、Todo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-surface)] rounded-[var(--radius-lg)] pl-10 pr-4 py-2.5 text-[14px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] border border-[var(--color-border)] focus:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 outline-none transition-ui" />
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mb-10" role="tablist" aria-label="模板分类">
        {CATEGORIES.map(cat => (
          <button key={cat}
            role="tab"
            aria-selected={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
            className={"px-4 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-ui focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 " +
              (activeCategory === cat
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)]')}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto" role="list" aria-label="模板列表">
        {filtered.map((t, i) => (
          <div key={t.id} role="listitem" style={{ animationDelay: `${i * 60}ms` }} className="animate-[fadeIn_400ms_ease-out_both]">
            <TemplateCard template={t} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[15px] text-[var(--color-text-secondary)]">没有匹配的模板</p>
          <p className="text-[13px] text-[var(--color-text-muted)] mt-1">试试其他关键词</p>
        </div>
      )}
    </div>
  );
}
