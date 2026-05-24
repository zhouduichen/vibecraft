'use client';
import { useState } from 'react';
import type { EditableSlot } from '@/config/manifests/types';

interface EditableSlotsPanelProps {
  manifestSlots: EditableSlot[];
  onRequestEdit: (slotId: string, value: string) => void;
  onRequestAiEdit: (prompt: string) => void;
}

type CategoryTab = 'content' | 'style' | 'structure' | 'data';

const CATEGORY_LABELS: Record<CategoryTab, string> = {
  content: '内容',
  style: '样式',
  structure: '结构',
  data: '数据',
};

export default function EditableSlotsPanel({
  manifestSlots,
  onRequestEdit,
  onRequestAiEdit,
}: EditableSlotsPanelProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>('content');

  const filteredSlots = manifestSlots.filter(s => s.category === activeTab);

  const handleSlotClick = (slot: EditableSlot) => {
    if (slot.type === 'text' || slot.type === 'number') {
      const val = prompt(`修改 ${slot.label}:`, slot.defaultValue || '');
      if (val !== null) onRequestEdit(slot.id, val);
    } else if (slot.type === 'select' && slot.options) {
      onRequestAiEdit(`把「${slot.label}」改为另一种风格`);
    } else if (slot.type === 'block') {
      onRequestAiEdit(`我想修改页面中的「${slot.label}」区域`);
    } else if (slot.type === 'boolean') {
      onRequestEdit(slot.id, slot.defaultValue === 'true' ? 'false' : 'true');
    } else if (slot.type === 'color') {
      onRequestEdit(slot.id, slot.defaultValue || '#d4453b');
    }
  };

  if (manifestSlots.length === 0) return null;

  return (
    <div className="border-t px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
        可改内容
      </p>

      {/* Category tabs */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {(Object.entries(CATEGORY_LABELS) as [CategoryTab, string][]).map(([cat, label]) => {
          const count = manifestSlots.filter(s => s.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className="text-[10px] px-2 py-1 rounded-full font-medium transition-colors"
              style={{
                background: activeTab === cat ? 'var(--color-accent)' : 'var(--color-surface-raised)',
                color: activeTab === cat ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Slot list */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {filteredSlots.map(slot => (
          <button
            key={slot.id}
            onClick={() => handleSlotClick(slot)}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors flex items-center justify-between gap-2 hover:opacity-80"
            style={{
              background: 'var(--color-base)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className="truncate">{slot.label}</span>
            <span className="text-[10px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
              {slot.type === 'block' ? '区块' : slot.type === 'select' ? slot.options?.length + ' 选项' : slot.type}
            </span>
          </button>
        ))}
        {filteredSlots.length === 0 && (
          <p className="text-[11px] py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
            当前分类无可改内容
          </p>
        )}
      </div>
    </div>
  );
}
