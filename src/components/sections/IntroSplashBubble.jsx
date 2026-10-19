import React, { useState, useEffect, useRef } from 'react';

const PHRASES = [
  'Hey there!',
  'Welcome!',
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
    }, 420);
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

    const currentTarget = PHRASES[phraseIndex];

    if (!isDeleting) {
      // Typing phase
      if (displayText.length < currentTarget.length) {
        loopTimerRef.current = setTimeout(() => {
          setDisplayText(currentTarget.slice(0, displayText.length + 1));
        }, 55);
      } else {
        // Full phrase typed: pause to read
        const pauseTime = phraseIndex === 0 ? 800 : 900;
        loopTimerRef.current = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else {
      // Deleting phase
      if (displayText.length > 0) {
        loopTimerRef.current = setTimeout(() => {
          setDisplayText(currentTarget.slice(0, displayText.length - 1));
        }, 32);
      } else {
        // Fully deleted
        if (phraseIndex < PHRASES.length - 1) {
          loopTimerRef.current = setTimeout(() => {
            setIsDeleting(false);
            setPhraseIndex((prev) => prev + 1);
          }, 200);
        } else {
          // Both phrases typed & deleted: dissolve out
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

  useEffect(() => {
    return () => {
      if (loopTimerRef.current) clearTimeout(loopTimerRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  if (!isMounted) return null;

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
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isExiting ? 'rgba(255, 255, 255, 0)' : 'rgba(255, 255, 255, 0.72)',
        backdropFilter: isExiting ? 'blur(0px)' : 'blur(4px)',
        WebkitBackdropFilter: isExiting ? 'blur(0px)' : 'blur(4px)',
        opacity: isExiting ? 0 : entered ? 1 : 0,
        pointerEvents: isExiting ? 'none' : 'auto',
        cursor: 'pointer',
        transition:
          'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), background-color 400ms cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Speech Bubble - EXACT match to provided reference */}
      <div
        aria-hidden="true"
        style={{
          backgroundColor: 'var(--color-cyan-primary, #42D2ED)',
          color: '#111111',
          border: '2px solid #111111',
          borderRadius: '0px 24px 24px 24px',
          padding: '18px 36px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
          transform: isExiting
            ? 'scale(0.96)'
            : !entered
            ? 'translateY(16px) scale(0.94)'
            : 'scale(1)',
          opacity: isExiting || !entered ? 0 : 1,
          transition:
            'opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: 'clamp(260px, 34vw, 380px)',
          minHeight: '86px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(2.4rem, 4.2vw, 3.2rem)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            color: '#111111',
          }}
        >
          {displayText}
          <span className="typewriter-cursor" />
        </span>
      </div>
    </div>
  );
}



