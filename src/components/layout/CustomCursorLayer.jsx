import React, { useEffect, useRef } from 'react';

// Context-aware cursor states. These sit deliberately outside the brand palette so the
// pill reads as a foreign presence — another person in the room, not part of the page.
const CURSOR_COLOR_STATES = {
  blue: { bg: '#2563EB', text: '#FFFFFF' },
  red: { bg: '#DC2626', text: '#FFFFFF' },
  orange: { bg: '#EA580C', text: '#FFFFFF' },
  green: { bg: '#10B981', text: '#111111' },
};
const DEFAULT_PILL = { bg: '#111111', text: '#FFFFFF' };

export function CustomCursorLayer() {
  const containerRef = useRef(null);
  const textLensRef = useRef(null);
  const dotRef = useRef(null);
  const pillRef = useRef(null);
  const seeCircleRef = useRef(null);
  const accentRef = useRef(null);
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

    document.documentElement.classList.add('has-custom-cursor');

    let rafId;

    const positionTextLens = (x, y, visible) => {
      const lens = textLensRef.current;
      if (!lens) return;

      const lensWidth = 410;
      const lensHeight = 430;
      const anchorX = 123;
      const anchorY = 129;
      const navbarHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 62;
      const left = Math.min(Math.max(x - anchorX, 0), Math.max(0, window.innerWidth - lensWidth));
      const top = Math.min(Math.max(y - anchorY, navbarHeight), Math.max(navbarHeight, window.innerHeight - lensHeight));

      lens.style.transform = `translate3d(${left}px, ${top}px, 0) scale(${visible ? 1 : 0})`;
      lens.style.opacity = visible ? '1' : '0';
    };

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
          pillRef.current.style.transform = `translate3d(${pillPos.current.x + 8}px, ${pillPos.current.y + 16}px, 0)`;
        }
        if (seeCircleRef.current) {
          seeCircleRef.current.style.transform = `translate3d(${dotPos.current.x}px, ${dotPos.current.y}px, 0) translate(-50%, -50%)`;
        }
        if (accentRef.current) {
          accentRef.current.style.transform = `translate3d(${dotPos.current.x + 9}px, ${dotPos.current.y - 17}px, 0)`;
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
      const colorHost = target && target.closest ? target.closest('[data-cursor-color]') : null;
      const textTarget = target && target.closest
        ? target.closest('h1,h2,h3,h4,h5,h6,p,a,button,label,li,span,strong,em,small,blockquote,figcaption,td,th,dt,dd')
        : null;
      const heroLensTarget = target && target.closest ? target.closest('[data-cursor-lens]') : null;
      const seeCircle = seeCircleRef.current;
      const dot = dotRef.current;
      const pill = pillRef.current;
      const accent = accentRef.current;

      // Context-aware pill colour (Royal Blue / Crimson / Orange / Emerald)
      const colorKey = colorHost ? colorHost.getAttribute('data-cursor-color') : null;
      const tone = CURSOR_COLOR_STATES[colorKey] || DEFAULT_PILL;
      if (pill) {
        pill.style.backgroundColor = tone.bg;
        pill.style.color = tone.text;
      }
      if (accent) {
        accent.classList.toggle('is-on', colorKey === 'blue');
      }

      positionTextLens(e.clientX, e.clientY, Boolean(textTarget && !heroLensTarget));

      if (seeCard && seeCircle && dot && pill) {
        isHoveringSee.current = true;
        seeCircle.style.display = 'flex';
        seeCircle.textContent = seeCard.getAttribute('data-cursor-see') || 'See';
        dot.style.display = 'none';
        pill.style.display = 'none';
        if (accent) accent.classList.remove('is-on');
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
      positionTextLens(mousePos.current.x, mousePos.current.y, false);
      initialized.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, []);

  return (
    <>
    <div
      ref={textLensRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '410px',
        height: '430px',
        backgroundColor: '#FFFFFF',
        mixBlendMode: 'difference',
        pointerEvents: 'none',
        zIndex: 90,
        opacity: 0,
        transform: 'translate3d(0px, 0px, 0) scale(0)',
        transformOrigin: '123px 129px',
        transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1), opacity 100ms linear',
        willChange: 'transform, opacity',
      }}
    />
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

      {/* Isometric Pixel-Block Accent — only present in the Royal Blue cursor state */}
      <div ref={accentRef} className="cursor-accent" aria-hidden="true">
        <span className="cursor-accent-inner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L15 5L8 9L1 5L8 1Z" fill="#60A5FA" />
            <path d="M1 5L8 9V15L1 11V5Z" fill="#2563EB" />
            <path d="M15 5L8 9V15L15 11V5Z" fill="#1D4ED8" />
            <path d="M8 1L15 5L8 9L1 5L8 1Z" stroke="#FFFFFF" strokeWidth="1" strokeLinejoin="round" />
            <path d="M1 5L8 9V15L1 11V5Z" stroke="#FFFFFF" strokeWidth="1" strokeLinejoin="round" />
            <path d="M15 5L8 9V15L15 11V5Z" stroke="#FFFFFF" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* Circular cursor marker with a light rim so it stays readable over inverted text. */}
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
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.14)',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          transition: 'background-color 180ms ease, color 180ms ease',
        }}
      >
        YOU
      </div>
    </div>
    </>
  );
}
