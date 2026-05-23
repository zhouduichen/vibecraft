'use client';

export default function BreathingGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Base fill */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--color-base)' }} />

      {/* Center glow field */}
      <div
        className="pointer-events-none absolute left-1/2"
        style={{
          top: '38%',
          width: 'clamp(600px, 80vw, 1100px)',
          height: 'clamp(360px, 50vw, 640px)',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, var(--glow-center) 0%, var(--glow-mid) 40%, transparent 75%)`,
          animation: 'glowBreathe 4.5s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* Ambient depth blobs */}
      <div
        className="pointer-events-none absolute rounded-full blur-[140px] ambient-float-1"
        style={{
          width: 'clamp(400px, 50vw, 700px)',
          height: 'clamp(400px, 50vw, 700px)',
          top: '10%',
          left: '10%',
          background: 'radial-gradient(circle, var(--glow-mid), transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute rounded-full blur-[120px] ambient-float-2"
        style={{
          width: 'clamp(300px, 40vw, 600px)',
          height: 'clamp(300px, 40vw, 600px)',
          bottom: '15%',
          right: '5%',
          background: 'radial-gradient(circle, var(--glow-mid), transparent 70%)',
        }}
      />
    </div>
  );
}
