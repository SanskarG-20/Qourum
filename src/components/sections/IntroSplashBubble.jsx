import React, { useState, useEffect, useRef } from 'react';

const PHRASES = [
  {
    text: 'Hey there!',
    badge: '01 / HELLO',
    subText: 'Setting up club canvas...',
  },
  {
    text: 'Welcome',
    badge: '02 / QUORUM',
    subText: 'Group-Aware Event Recommender',
  },
];

export function IntroSplashBubble({ onComplete }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [entered, setEntered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const loopTimerRef = useRef(null);
  const exitTimeoutRef = useRef(null);

  // Smooth dissolve dismissal
  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      setIsMounted(false);
      onComplete?.();
    }, 450); // Matches CSS dissolve transition duration
  };

  // Entrance transition
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsMounted(false);
      onComplete?.();
      return undefined;
    }

    const enterTimer = setTimeout(() => setEntered(true), 40);
    return () => clearTimeout(enterTimer);
  }, []);

  // Typewriter Engine
  useEffect(() => {
    if (!entered || isExiting || !isMounted) return;

    const currentTarget = PHRASES[phraseIndex].text;

    if (!isDeleting) {
      // Typing phase
      if (displayText.length < currentTarget.length) {
        loopTimerRef.current = setTimeout(() => {
          setDisplayText(currentTarget.slice(0, displayText.length + 1));
        }, 55); // Typing speed per character
      } else {
        // Full phrase typed: pause so user can comfortably read it
        const pauseTime = phraseIndex === 0 ? 850 : 950;
        loopTimerRef.current = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else {
      // Deleting phase
      if (displayText.length > 0) {
        loopTimerRef.current = setTimeout(() => {
          setDisplayText(currentTarget.slice(0, displayText.length - 1));
        }, 32); // Deleting speed per character
      } else {
        // Fully deleted
        if (phraseIndex < PHRASES.length - 1) {
          // Pause briefly then move to next phrase
          loopTimerRef.current = setTimeout(() => {
            setIsDeleting(false);
            setPhraseIndex((prev) => prev + 1);
          }, 220);
        } else {
          // All phrases completed typing and deleting: gracefully dissolve
          loopTimerRef.current = setTimeout(() => {
            handleDismiss();
          }, 150);
        }
      }
    }

    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
    };
  }, [displayText, isDeleting, phraseIndex, entered, isExiting, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  if (!isMounted) return null;

  const currentPhraseObj = PHRASES[phraseIndex];

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
          maxWidth: '92vw',
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
            padding: '24px 38px',
            boxShadow:
              '0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 8px 24px rgba(66, 210, 237, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
            transform: isExiting
              ? 'translateY(-16px) scale(0.96)'
              : !entered
              ? 'translateY(24px) scale(0.92)'
              : 'scale(1)',
            opacity: isExiting || !entered ? 0 : 1,
            transition: 'opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
            minWidth: 'clamp(300px, 42vw, 460px)',
            minHeight: '146px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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
            key={`badge-${phraseIndex}`}
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
              marginBottom: '6px',
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
            {currentPhraseObj.badge}
          </div>

          {/* Typewriter Text Display */}
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(2.1rem, 4vw, 3rem)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              minHeight: '1.25em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              color: '#111111',
            }}
          >
            <span>{displayText}</span>
            <span className="typewriter-cursor" />
          </div>

          {/* Subtext description */}
          <div
            key={`sub-${phraseIndex}`}
            className="intro-text-animate"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(17, 17, 17, 0.7)',
              letterSpacing: '0.02em',
              marginTop: '6px',
            }}
          >
            {currentPhraseObj.subText}
          </div>
        </div>

        {/* 2-Step Dot Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '2px',
            transition: 'opacity 300ms ease',
            opacity: isExiting ? 0 : 1,
          }}
        >
          {PHRASES.map((p, idx) => (
            <div
              key={p.text}
              style={{
                height: '6px',
                width: idx === phraseIndex ? '22px' : '6px',
                borderRadius: '999px',
                backgroundColor: idx === phraseIndex ? '#111111' : 'rgba(17, 17, 17, 0.22)',
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


