'use client';
import { SKILLS } from '@/config/skills';
import { useState } from 'react';

interface SkillSelectorProps {
  projectId: string;
  templateId: string;
  initialSkills?: string[];
}

export default function SkillSelector({ projectId, templateId, initialSkills = [] }: SkillSelectorProps) {
  const [selected, setSelected] = useState<string[]>(initialSkills);

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
      }).catch(err => {
        console.error('Failed to update skills:', err);
        setSelected(prev);
      });
      return next;
    });
  };

  if (availableSkills.length === 0) return null;

  return (
    <div className="px-4 py-2.5 border-t border-[var(--color-border)]">
      <p className="text-[11px] text-[var(--color-text-muted)] mb-2">附加技能（可选）</p>
      <div className="flex flex-wrap gap-1.5">
        {availableSkills.map(skill => (
          <button
            key={skill.id}
            onClick={() => toggle(skill.id)}
            className={"text-[11px] px-2.5 py-1 rounded-full font-medium transition-ui " +
              (selected.includes(skill.id)
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]')}
          >
            {skill.name}
          </button>
        ))}
      </div>
    </div>
  );
}
