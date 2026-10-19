import React, { useState, useEffect } from 'react';

export function IntroSplashBubble() {
  const [stage, setStage] = useState(0); // 0: 'Hey there!', 1: 'Q', 2: 'Welcome to Quorum!', 3: hidden

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setStage(3);
      return undefined;
    }

    const t1 = setTimeout(() => setStage(1), 320);
    const t2 = setTimeout(() => setStage(2), 580);
    const t3 = setTimeout(() => setStage(3), 1150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (stage === 3) return null;

  const text = stage === 0 ? 'Hey there!' : stage === 1 ? 'Q' : 'Welcome!';

  return (
    <div
      aria-label="Welcome! Hey there!"
      onClick={() => setStage(3)}
      style={{
        position: 'fixed',
        inset: 'var(--navbar-height) 0 0 0',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(2px)',
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'opacity 220ms ease',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          backgroundColor: 'var(--color-cyan-primary)',
          color: '#111111',
          border: '2px solid #111111',
          borderRadius: '0px 20px 20px 20px',
          padding: stage === 1 ? '18px 28px' : '20px 38px',
          fontFamily: 'var(--font-sans)',
          fontSize: 'clamp(1.85rem, 3.2vw, 2.75rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.12)',
          transform: stage === 1 ? 'scale(0.88)' : 'scale(1)',
          transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {text}
      </div>
    </div>
  );
}
