// src/components/DesignEnhancementToggle.tsx
'use client';
import { useState, useRef, useEffect } from 'react';

interface DesignEnhancementToggleProps {
  enabled: boolean;
  hasProfile: boolean;
  onToggle: (next: boolean) => void;
  onReset: () => void;
}

export default function DesignEnhancementToggle({
  enabled,
  hasProfile,
  onToggle,
  onReset,
}: DesignEnhancementToggleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = () => {
    if (enabled && hasProfile) {
      setMenuOpen(v => !v);
    } else {
      onToggle(!enabled);
    }
  };

  const handleReset = () => {
    setMenuOpen(false);
    onReset();
  };

  const handleDisable = () => {
    setMenuOpen(false);
    onToggle(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleClick}
        aria-pressed={enabled}
        className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2"
        style={
          enabled
            ? { background: 'var(--color-accent)', color: '#ffffff', boxShadow: '0 0 8px rgba(99,102,241,0.15)' }
            : { background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }
        }
        title={enabled ? '设计增强已开启' : '开启设计增强'}
      >
        设计增强
      </button>

      {menuOpen && enabled && (
        <div
          className="absolute bottom-full left-0 mb-1 w-40 rounded-lg p-1 z-20 shadow-lg"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <button
            onClick={handleReset}
            className="w-full text-left px-3 py-1.5 rounded text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            重新设定
          </button>
          <button
            onClick={handleDisable}
            className="w-full text-left px-3 py-1.5 rounded text-[12px] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
          >
            关闭设计增强
          </button>
        </div>
      )}
    </div>
  );
}
