'use client';
import { useState } from 'react';
import { SKILLS } from '@/config/skills';
import type { Skill } from '@/config/skills';

interface SkillSelectorProps {
  projectId: string;
  templateId: string;
  selectedSkills?: string[];
  onChange?: (skills: string[]) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  chart: '图表',
  export: '导出',
  alert: '提醒',
  optimize: '优化',
  share: '分享',
};

export default function SkillSelector({ projectId, templateId, selectedSkills = [], onChange }: SkillSelectorProps) {
  const [confirmingConflict, setConfirmingConflict] = useState<string | null>(null);

  const availableSkills = Object.values(SKILLS).filter(
    s => s.compatibleTemplates.includes(templateId) || s.compatibleTemplates.includes('*')
  );

  // Group by category
  const groupedByCategory: Record<string, Skill[]> = {};
  availableSkills.forEach(s => {
    const cat = s.category || 'other';
    if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
    groupedByCategory[cat].push(s);
  });

  const toggle = (skillId: string) => {
    const skill = SKILLS[skillId];
    if (!skill) return;

    // Check conflicts
    const hasConflict = skill.conflicts.some(c => selectedSkills.includes(c));
    if (hasConflict && !selectedSkills.includes(skillId)) {
      setConfirmingConflict(skillId);
      return;
    }

    performToggle(skillId);
  };

  const performToggle = (skillId: string) => {
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
    setConfirmingConflict(null);
  };

  if (availableSkills.length === 0) return null;

  return (
    <fieldset className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <legend className="text-[11px] text-[var(--color-text-muted)] mb-2">附加技能</legend>
      {Object.entries(groupedByCategory).map(([category, skills]) => (
        <div key={category} className="mb-2 last:mb-0">
          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {CATEGORY_LABELS[category] || category}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(skill => {
              const isActive = selectedSkills.includes(skill.id);
              const hasConflict = skill.conflicts.some(c => selectedSkills.includes(c));
              const disabled = hasConflict && !isActive;
              return (
                <button
                  key={skill.id}
                  onClick={() => toggle(skill.id)}
                  disabled={disabled}
                  aria-pressed={isActive}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all duration-180 focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    background: isActive ? 'var(--color-accent)' : disabled ? 'var(--color-surface-raised)' : 'var(--color-surface-raised)',
                    color: isActive ? '#ffffff' : disabled ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                  title={disabled ? `与已启用的技能冲突` : skill.description}
                >
                  {skill.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Conflict confirmation dialog */}
      {confirmingConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setConfirmingConflict(null)}>
          <div
            className="rounded-xl p-4 max-w-xs w-full shadow-xl mx-4"
            style={{ background: 'var(--color-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>技能冲突</p>
            <p className="text-[12px] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              该技能与已启用的其他技能存在冲突。确定要切换吗？
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmingConflict(null)}
                className="text-[12px] px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--color-base)', color: 'var(--color-text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={() => performToggle(confirmingConflict)}
                className="text-[12px] px-3 py-1.5 rounded-lg text-white"
                style={{ background: 'var(--color-accent)' }}
              >
                确定切换
              </button>
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
