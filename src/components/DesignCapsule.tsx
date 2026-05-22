'use client';
import { useRef, useEffect, useState } from 'react';
import type { DesignProfile } from '@/lib/db';

interface DesignCapsuleProps {
  profile: DesignProfile | null;
  onToggle: (next: boolean) => void;
  onReset: () => void;
}

function summarize(profile: DesignProfile): string {
  const theme = profile.theme === 'dark' ? '深色' : '浅色';
  const color: Record<string, string> = {
    indigo: '靛蓝', amber: '琥珀', zinc: '锌灰',
    emerald: '翠绿', rose: '玫红', blue: '蓝', violet: '紫',
  };
  const accent = color[profile.accentColor] || profile.accentColor;
  const motion = profile.motion === 'none' ? '无动效' : profile.motion === 'subtle' ? '微妙过渡' : '趣味动效';
  return `${theme} · ${accent} · ${motion}`;
}

export default function DesignCapsule({ profile, onToggle, onReset }: DesignCapsuleProps) {
  const enabled = !!profile;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Capsule card */}
      <button
        onClick={() => {
          if (enabled) {
            setMenuOpen(v => !v);
          } else {
            onToggle(true);
          }
        }}
        className="w-full text-left rounded-2xl p-4 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2 group"
        style={
          enabled
            ? {
                background: 'linear-gradient(135deg, var(--color-accent-subtle) 0%, rgba(108,114,240,0.04) 100%)',
                border: '1px solid var(--color-accent)',
                boxShadow: '0 0 16px rgba(108,114,240,0.08)',
              }
            : {
                background: 'var(--color-base)',
                border: '1px dashed var(--color-border)',
              }
        }
      >
        {/* Top row: label + toggle */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[12px] font-medium"
            style={{ color: enabled ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
          >
            设计增强
          </span>
          {/* Toggle switch */}
          <div
            className="w-9 h-5 rounded-full relative transition-colors duration-250 flex-shrink-0"
            style={{
              background: enabled ? 'var(--color-accent)' : 'var(--color-border)',
            }}
          >
            <div
              className="w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all duration-250 bg-white"
              style={{ left: enabled ? '18px' : '3px' }}
            />
          </div>
        </div>

        {/* Summary */}
        {enabled ? (
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {summarize(profile)}
          </p>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            开启后，AI 将为你的应用匹配专属设计语言
          </p>
        )}
      </button>

      {/* Dropdown menu */}
      {menuOpen && enabled && (
        <div
          className="absolute bottom-full left-0 mb-1 w-44 rounded-xl p-1 z-20 shadow-xl"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {/* Mini profile preview */}
          <div className="px-3 py-2 border-b mb-1" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-[11px] text-[var(--color-text-muted)]">当前设定</p>
            <p className="text-[12px] font-medium text-[var(--color-text-primary)] mt-0.5 leading-relaxed">
              {summarize(profile)}
            </p>
          </div>
          <button
            onClick={() => { setMenuOpen(false); onReset(); }}
            className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-raised)] transition-colors"
          >
            重新设定
          </button>
          <button
            onClick={() => { setMenuOpen(false); onToggle(false); }}
            className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
          >
            关闭设计增强
          </button>
        </div>
      )}
    </div>
  );
}
