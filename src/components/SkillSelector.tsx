'use client';
import { SKILLS } from '@/config/skills';

interface SkillSelectorProps {
  projectId: string;
  templateId: string;
  selectedSkills?: string[];
  onChange?: (skills: string[]) => void;
}

export default function SkillSelector({ projectId, templateId, selectedSkills = [], onChange }: SkillSelectorProps) {
  const availableSkills = Object.values(SKILLS).filter(
    s => s.compatibleTemplates.includes(templateId) || s.compatibleTemplates.includes('*')
  );

  const toggle = (skillId: string) => {
    const previous = selectedSkills;
    const next = previous.includes(skillId)
      ? previous.filter(s => s !== skillId)
      : [...previous, skillId];

    onChange?.(next);
    fetch(`/api/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_skills: next }),
    }).catch(err => {
      console.error('Failed to update skills:', err);
      onChange?.(previous);
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
            aria-pressed={selectedSkills.includes(skill.id)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all duration-180 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
            style={
              selectedSkills.includes(skill.id)
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
