import React, { useEffect, useRef } from 'react';

export function CustomCursorLayer() {
  const wrapRef = useRef(null);
  const dotRef = useRef(null);
  const pillRef = useRef(null);
  const seeCircleRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    if (mediaQuery.matches || coarsePointer.matches) {
      return undefined;
    }

    const handleMouseMove = (e) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      wrap.style.display = 'block';
      wrap.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      const target = e.target;
      const seeCard = target && target.closest ? target.closest('[data-cursor-see]') : null;
      const seeCircle = seeCircleRef.current;
      const dot = dotRef.current;
      const pill = pillRef.current;

      if (seeCard && seeCircle && dot && pill) {
        seeCircle.style.display = 'flex';
        seeCircle.textContent = seeCard.getAttribute('data-cursor-see') || 'See';
        dot.style.display = 'none';
      } else if (seeCircle && dot && pill) {
        seeCircle.style.display = 'none';
        dot.style.display = 'block';
      }
    };

    const handleMouseLeave = () => {
      if (wrapRef.current) {
        wrapRef.current.style.display = 'none';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'none',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'transform 38ms linear',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div
          ref={seeCircleRef}
          style={{
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
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
          }}
        >
          See
        </div>
        <div
          ref={dotRef}
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: '#111111',
            border: '1.5px solid #FFFFFF',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          ref={pillRef}
          style={{
            marginLeft: '4px',
            marginTop: '18px',
            backgroundColor: '#111111',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: '999px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          YOU
        </div>
      </div>
    </div>
  );
}
