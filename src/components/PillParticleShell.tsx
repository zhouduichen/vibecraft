'use client';

import { useRef, useState, useEffect, useMemo } from 'react';

function hash(i: number) {
  let h = i * 2654435761;
  h = Math.imul ? Math.imul(h ^ (h >>> 16), 2246822507) : h;
  h = h ^ (h >>> 13);
  return (h >>> 0) / 4294967296;
}

/* ── Config ── */
const EDGE_COUNT = 180;
const FIELD_COUNT = 280;

const COLORS = [
  '#6a9aff', '#82b4ff',
  '#70d2e0', '#7ed6e8',
  '#9e8cf0', '#b494f8',
  '#e090d0', '#f0a0b8',
];

interface Pt {
  id: number; x: number; y: number; size: number;
  color: string; delay: string; duration: string;
}

/* ── Capsule contour point ── */
function capsulePoint(t: number, W: number, H: number) {
  const R = H / 2;
  const topLen = W - 2 * R;
  const capLen = Math.PI * R;
  const perim = 2 * topLen + 2 * capLen;
  let s = ((t % perim) + perim) % perim;

  if (s < topLen)           return { x: R + s, y: 0,          nx: 0,  ny: -1 };
  s -= topLen;
  if (s < capLen) { const a = -Math.PI / 2 + s / R; return { x: W - R + R * Math.cos(a), y: R + R * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) }; }
  s -= capLen;
  if (s < topLen)           return { x: W - R - s, y: H,      nx: 0,  ny: 1  };
  s -= topLen;
  const a = Math.PI / 2 + s / R; return { x: R + R * Math.cos(a), y: R + R * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
}

export default function PillParticleShell({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ W: number; H: number } | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setDims({ W: r.width, H: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const particles = useMemo<Pt[]>(() => {
    if (!dims) return [];
    const { W, H } = dims;
    const R = H / 2;
    const topLen = W - 2 * R;
    const capLen = Math.PI * R;
    const perim = 2 * topLen + 2 * capLen;
    const list: Pt[] = [];

    // Edge particles — tight, along capsule contour
    for (let i = 0; i < EDGE_COUNT; i++) {
      const t = hash(i * 5) * perim;
      const cp = capsulePoint(t, W, H);
      const offset = 4 + hash(i * 11) * 24;
      list.push({
        id: i,
        x: cp.x + cp.nx * offset,
        y: cp.y + cp.ny * offset,
        size: 2.5 + hash(i * 7) * 3,
        color: COLORS[Math.floor(hash(i * 13) * COLORS.length)],
        delay: (hash(i * 17) * 3.6).toFixed(2),
        duration: (3.0 + hash(i * 19) * 1.4).toFixed(2),
      });
    }

    // Field particles — wide elliptical distribution
    const cx = W / 2, cy = H / 2;
    const rx = W * 0.60;
    const ry = H * 2.7;
    for (let i = 0; i < FIELD_COUNT; i++) {
      const angle = hash(i * 31) * Math.PI * 2;
      const r = 0.12 + hash(i * 37) * 1.0; // 0.12 to 1.12 of ellipse radius
      const px = cx + Math.cos(angle) * rx * r;
      const py = cy + Math.sin(angle) * ry * r;
      list.push({
        id: EDGE_COUNT + i,
        x: px,
        y: py,
        size: 2 + hash(i * 41) * 4,
        color: COLORS[Math.floor(hash(i * 43) * COLORS.length)],
        delay: (hash(i * 47) * 4.0).toFixed(2),
        duration: (3.2 + hash(i * 53) * 1.8).toFixed(2),
      });
    }

    return list;
  }, [dims]);

  return (
    <div ref={wrapperRef} className={className} style={{ position: 'relative', ...style }}>
      {dims && (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: dims.W * 1.4,
            height: dims.H * 5.5,
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
            maskImage: 'radial-gradient(ellipse 40% 40% at 50% 50%, black 0%, black 45%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 40% 40% at 50% 50%, black 0%, black 45%, transparent 80%)',
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: dims.W,
              height: dims.H,
              transform: 'translate(-50%, -50%)',
              animation: 'fieldBreathe 4s ease-in-out infinite',
              willChange: 'transform',
            }}
          >
            {particles.map(p => (
              <div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  left: p.x,
                  top: p.y,
                  background: p.color,
                  opacity: 0,
                  animationName: 'pGlow',
                  animationDuration: `${p.duration}s`,
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${p.delay}s`,
                  willChange: 'opacity',
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
