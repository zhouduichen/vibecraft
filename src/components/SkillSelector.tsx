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
    <fieldset className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <legend className="text-[11px] text-[var(--color-text-muted)] mb-2">附加技能</legend>
      <div className="flex flex-wrap gap-1.5">
        {availableSkills.map(skill => (
          <button
            key={skill.id}
            onClick={() => toggle(skill.id)}
            aria-pressed={selected.includes(skill.id)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all duration-180 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
            style={
              selected.includes(skill.id)
                ? { background: 'var(--color-accent)', color: '#ffffff' }
                : { background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }
            }
          >
            {skill.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
