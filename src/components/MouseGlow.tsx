'use client';
import { useEffect, useRef } from 'react';

export default function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let frame: number;
    let targetX = -1000;
    let targetY = -1000;
    let currentX = -1000;
    let currentY = -1000;
    let hasMoved = false;
    const root = document.documentElement;

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      root.style.setProperty('--mouse-x', String(e.clientX / window.innerWidth));
      root.style.setProperty('--mouse-y', String(e.clientY / window.innerHeight));
      if (!hasMoved) {
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        glow.style.opacity = '1';
      }
    };

    const animate = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * 0.12;
      currentY += dy * 0.12;
      glow.style.left = `${currentX}px`;
      glow.style.top = `${currentY}px`;
      frame = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    frame = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="mouse-glow"
      style={{ opacity: 0, left: -1000, top: -1000 }}
      aria-hidden="true"
    />
  );
}
