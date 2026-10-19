import React, { useState, useEffect, useRef } from 'react';

const INTRO_STAGES = [
  {
    id: 'hello',
    badge: '01 / INTRO',
    mainText: 'Hey there! 👋',
    subText: 'Setting up club canvas...',
  },
  {
    id: 'brand',
    badge: '02 / SYSTEM',
    mainText: 'Q',
    subText: 'Group-Aware Recommendation',
    isBrandMark: true,
  },
  {
    id: 'welcome',
    badge: '03 / QUORUM',
    mainText: 'Welcome to Quorum!',
    subText: 'Fair, explainable event decisions',
  },
];

export function IntroSplashBubble({ onComplete }) {
  const [stageIndex, setStageIndex] = useState(0);
  const [entered, setEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const exitTimeoutRef = useRef(null);

  // Trigger graceful exit sequence
  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    exitTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
      onComplete?.();
    }, 450); // Matches CSS dissolve transition duration
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsMounted(false);
      onComplete?.();
      return undefined;
    }

    // Phase 0: trigger organic entrance
    const enterTimer = setTimeout(() => setEntered(true), 40);

    // Phase 1: smoothly advance to 'Q' mark
    const t1 = setTimeout(() => setStageIndex(1), 950);

    // Phase 2: smoothly expand to 'Welcome to Quorum!'
    const t2 = setTimeout(() => setStageIndex(2), 1850);

    // Phase 3: begin graceful fade-out dissolve
    const t3 = setTimeout(() => handleDismiss(), 3050);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  if (!isMounted) return null;

  const currentStage = INTRO_STAGES[stageIndex];

  return (
    <div
      role="dialog"
      aria-label="Welcome to Quorum Introduction"
      onClick={handleDismiss}
      style={{
        position: 'fixed',
        inset: 'var(--navbar-height, 62px) 0 0 0',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isExiting ? 'rgba(255, 255, 255, 0)' : 'rgba(255, 255, 255, 0.82)',
        backdropFilter: isExiting ? 'blur(0px)' : 'blur(6px)',
        WebkitBackdropFilter: isExiting ? 'blur(0px)' : 'blur(6px)',
        opacity: isExiting ? 0 : entered ? 1 : 0,
        pointerEvents: isExiting ? 'none' : 'auto',
        cursor: 'pointer',
        transition:
          'opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), background-color 420ms cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 420ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Speech Bubble Container */}
      <div
        className="intro-floating-bubble"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '90vw',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            backgroundColor: 'var(--color-cyan-primary, #42D2ED)',
            color: '#111111',
            border: '2px solid #111111',
            borderRadius: '0px 24px 24px 24px',
            padding: currentStage.isBrandMark ? '24px 52px' : '28px 46px',
            boxShadow:
              '0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 8px 24px rgba(66, 210, 237, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transform: isExiting
              ? 'translateY(-16px) scale(0.96)'
              : !entered
              ? 'translateY(24px) scale(0.92)'
              : currentStage.isBrandMark
              ? 'scale(0.95)'
              : 'scale(1)',
            opacity: isExiting || !entered ? 0 : 1,
            transition: 'all 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            minWidth: currentStage.isBrandMark ? '160px' : '280px',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          {/* Subtle Speech-Bubble Pointer Notch (CAD Chamfer Detail) */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              left: '-2px',
              width: '14px',
              height: '14px',
              backgroundColor: 'var(--color-cyan-primary, #42D2ED)',
              borderTop: '2px solid #111111',
              borderLeft: '2px solid #111111',
              transform: 'rotate(45deg)',
            }}
          />

          {/* Micro Stage Pill */}
          <div
            key={`badge-${stageIndex}`}
            className="intro-text-animate"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 10px',
              backgroundColor: 'rgba(17, 17, 17, 0.08)',
              borderRadius: '999px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'rgba(17, 17, 17, 0.75)',
              marginBottom: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#111111',
                display: 'inline-block',
              }}
            />
            {currentStage.badge}
          </div>

          {/* Animated Main Text with Smooth Glide & Filter */}
          <div
            key={`main-${stageIndex}`}
            className="intro-text-animate"
            style={{
              fontFamily: currentStage.isBrandMark ? 'var(--font-display)' : 'var(--font-sans)',
              fontSize: currentStage.isBrandMark
                ? 'clamp(2.8rem, 5vw, 4rem)'
                : 'clamp(1.75rem, 3.2vw, 2.6rem)',
              fontWeight: currentStage.isBrandMark ? 700 : 600,
              letterSpacing: currentStage.isBrandMark ? '0.04em' : '-0.02em',
              lineHeight: 1.15,
              marginTop: '2px',
              marginBottom: '4px',
            }}
          >
            {currentStage.mainText}
          </div>

          {/* Subtext description */}
          <div
            key={`sub-${stageIndex}`}
            className="intro-text-animate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(17, 17, 17, 0.7)',
              letterSpacing: '0.02em',
            }}
          >
            {currentStage.subText}
          </div>
        </div>

        {/* 3-Step Dot Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '4px',
            transition: 'opacity 300ms ease',
            opacity: isExiting ? 0 : 1,
          }}
        >
          {INTRO_STAGES.map((s, idx) => (
            <div
              key={s.id}
              style={{
                height: '6px',
                width: idx === stageIndex ? '22px' : '6px',
                borderRadius: '999px',
                backgroundColor: idx === stageIndex ? '#111111' : 'rgba(17, 17, 17, 0.22)',
                transition: 'all 320ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          ))}
        </div>

        {/* Dismissal Hint */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.06em',
            color: '#777777',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            padding: '3px 10px',
            borderRadius: '999px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            marginTop: '2px',
            opacity: isExiting ? 0 : 0.85,
            transition: 'opacity 300ms ease',
          }}
        >
          click anywhere to skip ✕
        </div>
      </div>
    </div>
  );
}

