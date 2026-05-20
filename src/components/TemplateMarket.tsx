'use client';
import { useState } from 'react';
import { TEMPLATES } from '@/config/templates';
import TemplateCard from './TemplateCard';

const CATEGORIES = ['全部', '记账', '日程', '打卡'];

export default function TemplateMarket() {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(t => {
    const matchCat = activeCategory === '全部' || t.category === activeCategory;
    const matchSearch = !search || t.name.includes(search) || t.description.includes(search) || t.tags.some(tag => tag.includes(search));
    return matchCat && matchSearch;
  });

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">VibeCraft</h1>
        <p className="text-slate-400">选择一个模板，用自然语言定制你的专属应用</p>
      </div>

      <div className="max-w-md mx-auto mb-6">
        <input type="text" placeholder="搜索模板...（如：记账、打卡）"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-indigo-500 transition" />
      </div>

      <div className="flex justify-center gap-2 mb-8">
        {CATEGORIES.map(cat => (
          <button key={cat}
            onClick={() => setActiveCategory(cat)}
            className={"px-5 py-2 rounded-full text-sm font-medium transition " +
              (activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {filtered.map(t => <TemplateCard key={t.id} template={t} />)}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-slate-500 py-12">没有匹配的模板</p>
      )}
    </div>
  );
}
