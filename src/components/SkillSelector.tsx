'use client';
import { SKILLS } from '@/config/skills';
import { useState } from 'react';

interface SkillSelectorProps {
  projectId: string;
  templateId: string;
}

export default function SkillSelector({ projectId, templateId }: SkillSelectorProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const availableSkills = Object.values(SKILLS).filter(
    s => s.compatibleTemplates.includes(templateId) || s.compatibleTemplates.includes('*')
  );

  const toggle = (skillId: string) => {
    setSelected(prev => {
      const next = prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId];
      fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_skills: next }),
      }).catch(console.error);
      return next;
    });
  };

  if (availableSkills.length === 0) return null;

  return (
    <div className="px-4 py-2 border-t border-slate-700/50">
      <p className="text-xs text-slate-500 mb-2">附加技能（可选）</p>
      <div className="flex flex-wrap gap-2">
        {availableSkills.map(skill => (
          <button
            key={skill.id}
            onClick={() => toggle(skill.id)}
            className={"text-xs px-3 py-1.5 rounded-full font-medium transition " +
              (selected.includes(skill.id)
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}
          >
            {skill.name}
          </button>
        ))}
      </div>
    </div>
  );
}
