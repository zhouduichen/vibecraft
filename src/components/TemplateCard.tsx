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
    <div className="group bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10">
      <div className="aspect-[4/3] bg-slate-900 overflow-hidden relative flex items-center justify-center text-5xl bg-gradient-to-b from-slate-900 to-slate-800">
        {template.icon}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400">{template.category}</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">{template.name}</h3>
        <p className="text-sm text-slate-400 mb-3">{template.description}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {template.tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-slate-700 text-slate-400">{tag}</span>
          ))}
        </div>
        <button onClick={handleUse}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition">
          使用此模板
        </button>
      </div>
    </div>
  );
}
