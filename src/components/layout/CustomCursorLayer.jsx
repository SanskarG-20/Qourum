import React, { useEffect, useRef } from 'react';

export function CustomCursorLayer() {
  const containerRef = useRef(null);
  const dotRef = useRef(null);
  const pillRef = useRef(null);
  const seeCircleRef = useRef(null);
  const mousePos = useRef({ x: -200, y: -200 });
  const dotPos = useRef({ x: -200, y: -200 });
  const pillPos = useRef({ x: -200, y: -200 });
  const initialized = useRef(false);
  const isHoveringSee = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    if (mediaQuery.matches || coarsePointer.matches) {
      return undefined;
    }

    let rafId;

    const loop = () => {
      if (initialized.current) {
        dotPos.current.x += (mousePos.current.x - dotPos.current.x) * 0.28;
        dotPos.current.y += (mousePos.current.y - dotPos.current.y) * 0.28;
        pillPos.current.x += (mousePos.current.x - pillPos.current.x) * 0.16;
        pillPos.current.y += (mousePos.current.y - pillPos.current.y) * 0.16;

        if (dotRef.current) {
          dotRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
        }
        if (pillRef.current) {
          pillRef.current.style.transform = `translate3d(${pillPos.current.x + 6}px, ${pillPos.current.y + 18}px, 0)`;
        }
        if (seeCircleRef.current) {
          seeCircleRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
        }
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    const handleMouseMove = (e) => {
      if (!initialized.current) {
        dotPos.current = { x: e.clientX, y: e.clientY };
        pillPos.current = { x: e.clientX, y: e.clientY };
        initialized.current = true;
      }
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (containerRef.current) {
        containerRef.current.style.display = 'block';
      }

      const target = e.target;
      const seeCard = target && target.closest ? target.closest('[data-cursor-see]') : null;
      const seeCircle = seeCircleRef.current;
      const dot = dotRef.current;
      const pill = pillRef.current;

      if (seeCard && seeCircle && dot && pill) {
        isHoveringSee.current = true;
        seeCircle.style.display = 'flex';
        seeCircle.textContent = seeCard.getAttribute('data-cursor-see') || 'See';
        dot.style.display = 'none';
        pill.style.display = 'none';
      } else if (seeCircle && dot && pill) {
        isHoveringSee.current = false;
        seeCircle.style.display = 'none';
        dot.style.display = 'block';
        pill.style.display = 'block';
      }
    };

    const handleMouseLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.display = 'none';
      }
      initialized.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'none',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {/* Expanded "See" Circle for Case Study Cards */}
      <div
        ref={seeCircleRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'none',
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          backgroundColor: '#111111',
          color: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          fontSize: '16px',
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          willChange: 'transform',
        }}
      >
        See
      </div>

      {/* 14px Solid #111111 Circle with 1.5px Solid #FFFFFF Border */}
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: '#111111',
          border: '1.5px solid #FFFFFF',
          willChange: 'transform',
        }}
      />

      {/* Trailing Elastic "YOU" Pill */}
      <div
        ref={pillRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          backgroundColor: '#111111',
          color: '#FFFFFF',
          padding: '3px 10px',
          borderRadius: '9999px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          whiteSpace: 'nowrap',
          willChange: 'transform',
        }}
      >
        YOU
      </div>
    </div>
  );
}
