import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { WORKING_TITLES } from '../../config/siteConfig.js';
import { SelectionBox } from '../ui/SelectionBox.jsx';
import { CursorBadge } from '../ui/CursorBadge.jsx';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { InlineTargetIcon, InlineFlowerIcon, HandUnderline } from '../ui/GeometricIcons.jsx';

export function HeroSection({
  workingTitleId,
  onChangeWorkingTitle,
  thresholdPct,
  onChangeThreshold,
  organizerAvatar,
  onJumpToDemo,
  introCompleted = false,
}) {
  const clockRef = useRef(null);
  const heroSectionRef = useRef(null);
  const lensRef = useRef(null);
  const [leftAvatarExpanded, setLeftAvatarExpanded] = useState(false);
  const [rightAvatarExpanded, setRightAvatarExpanded] = useState(false);
  const [isLensDragging, setIsLensDragging] = useState(false);

  const currentTitleObj = WORKING_TITLES.find((t) => t.id === workingTitleId) || WORKING_TITLES[0];

  useLayoutEffect(() => {
    const formatTime = () => {
      const now = new Date();
      return (
        now.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' • RS_MINI PROJECT 2026-27'
      );
    };
    if (clockRef.current) {
      clockRef.current.textContent = formatTime();
    }
    const timer = setInterval(() => {
      if (clockRef.current) {
        clockRef.current.textContent = formatTime();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Difference-Blend Inversion Lens
  //    - Iries open out of the circle cursor on hover and retracts back into it
  //    - Spring-follows the pointer (stiffness 180, damping 22) and can be dragged
  //      across the whole hero canvas
  //    - Releasing a real drag retracts it into the cursor
  const LENS_WIDTH = 410;
  const LENS_HEIGHT = 430;
  const LENS_ANCHOR_X = 123; // pointer rests 30% across the lens
  const LENS_ANCHOR_Y = 129; // pointer rests 30% down the lens
  const SPRING_STIFFNESS = 180;
  const SPRING_DAMPING = 22;
  const LENS_DRAG_THRESHOLD = 4;
  const LENS_EXPAND_MS = 300; // iris open
  const LENS_RETRACT_MS = 240; // suck back into the cursor

  const lensPos = useRef({ x: 0, y: 0 });
  const lensVel = useRef({ x: 0, y: 0 });
  const lensTarget = useRef({ x: 0, y: 0 });
  const lensRafRef = useRef(0);
  const lensLastTsRef = useRef(0);
  // 'idle' | 'visible' | 'dragging' | 'dismissed'
  const lensModeRef = useRef('idle');
  const lensMovedRef = useRef(false);
  const lensDownPosRef = useRef({ x: 0, y: 0 });
  const lensScaleRef = useRef({ value: 0 });
  const lensScaleAnimRef = useRef(null);

  const easeOutQuart = (p) => 1 - Math.pow(1 - p, 4);
  const easeInCubic = (p) => p * p * p;

  const aimLensAt = (clientX, clientY) => {
    const section = heroSectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const rawX = clientX - rect.left - LENS_ANCHOR_X;
    const rawY = clientY - rect.top - LENS_ANCHOR_Y;
    lensTarget.current = {
      x: Math.min(Math.max(rawX, 0), Math.max(0, rect.width - LENS_WIDTH)),
      y: Math.min(Math.max(rawY, 0), Math.max(0, rect.height - LENS_HEIGHT)),
    };
  };

  // Scale tween: 0 = collapsed to a point on the cursor, 1 = full 410x430 box.
  // Opacity is derived from the scale (not tweened separately) so the box stays a
  // solid black inversion instead of washing out to grey mid-iris.
  const LENS_OPACITY_FLOOR = 0.25;
  const setLensScale = (to, duration) => {
    // Reduced motion: land on the target size instantly rather than irising.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lensScaleAnimRef.current = null;
      lensScaleRef.current.value = to;
      return;
    }
    lensScaleAnimRef.current = {
      from: lensScaleRef.current.value,
      to,
      start: performance.now(),
      duration,
      ease: to > 0 ? easeOutQuart : easeInCubic,
    };
  };

  const runLensSpring = () => {
    const tick = (now) => {
      const dt = lensLastTsRef.current ? Math.min((now - lensLastTsRef.current) / 1000, 1 / 30) : 1 / 60;
      lensLastTsRef.current = now;
      const subSteps = 4;
      const h = dt / subSteps;
      for (let i = 0; i < subSteps; i += 1) {
        const ax =
          (lensTarget.current.x - lensPos.current.x) * SPRING_STIFFNESS - lensVel.current.x * SPRING_DAMPING;
        const ay =
          (lensTarget.current.y - lensPos.current.y) * SPRING_STIFFNESS - lensVel.current.y * SPRING_DAMPING;
        lensVel.current.x += ax * h;
        lensVel.current.y += ay * h;
        lensPos.current.x += lensVel.current.x * h;
        lensPos.current.y += lensVel.current.y * h;
      }

      // Iris scale tween
      const anim = lensScaleAnimRef.current;
      if (anim) {
        const p = Math.min(1, (now - anim.start) / anim.duration);
        const eased = anim.ease(p);
        lensScaleRef.current.value = anim.from + (anim.to - anim.from) * eased;
        if (p >= 1) lensScaleAnimRef.current = null;
      }

      if (lensRef.current) {
        lensRef.current.style.transform = `translate3d(${lensPos.current.x}px, ${lensPos.current.y}px, 0) scale(${lensScaleRef.current.value})`;
        lensRef.current.style.opacity = `${Math.min(1, lensScaleRef.current.value / LENS_OPACITY_FLOOR)}`;
      }

      const stillActive =
        lensModeRef.current === 'visible' ||
        lensModeRef.current === 'dragging' ||
        lensScaleAnimRef.current !== null;
      if (stillActive) {
        lensRafRef.current = requestAnimationFrame(tick);
      } else {
        lensRafRef.current = 0;
      }
    };
    lensLastTsRef.current = 0;
    lensRafRef.current = requestAnimationFrame(tick);
  };

  const startLensLoop = () => {
    if (!lensRafRef.current) runLensSpring();
  };

  // Hover over the title stage -> the lens irises open out of the circle cursor
  const handleStagePointerEnter = (e) => {
    if (e.pointerType === 'touch') return;
    if (lensModeRef.current === 'dragging') return;
    aimLensAt(e.clientX, e.clientY);
    lensPos.current = { x: lensTarget.current.x, y: lensTarget.current.y };
    lensVel.current = { x: 0, y: 0 };
    lensModeRef.current = 'visible';
    setLensScale(1, LENS_EXPAND_MS);
    startLensLoop();
  };

  const handleStagePointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    if (lensModeRef.current !== 'visible') return;
    aimLensAt(e.clientX, e.clientY);
  };

  // Leaving -> the box sucks back into the cursor
  const handleStagePointerLeave = () => {
    if (lensModeRef.current !== 'visible') return;
    lensModeRef.current = 'idle';
    setLensScale(0, LENS_RETRACT_MS);
    startLensLoop();
  };

  const handleStagePointerDown = (e) => {
    if (e.button !== 0) return;
    // Touch pointers keep native page scrolling — the lens is a mouse/pen affordance.
    if (e.pointerType === 'touch') return;
    lensModeRef.current = 'dragging';
    lensMovedRef.current = false;
    lensDownPosRef.current = { x: e.clientX, y: e.clientY };
    aimLensAt(e.clientX, e.clientY);
    setIsLensDragging(true);
    document.body.style.userSelect = 'none';
    if (lensScaleRef.current.value < 1) setLensScale(1, LENS_EXPAND_MS);
    startLensLoop();
    e.preventDefault();
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (lensModeRef.current !== 'dragging') return;
      const dx = e.clientX - lensDownPosRef.current.x;
      const dy = e.clientY - lensDownPosRef.current.y;
      if (!lensMovedRef.current && Math.hypot(dx, dy) > LENS_DRAG_THRESHOLD) {
        lensMovedRef.current = true;
      }
      aimLensAt(e.clientX, e.clientY);
    };

    const endLensDrag = () => {
      if (lensModeRef.current !== 'dragging') return;
      document.body.style.userSelect = '';
      setIsLensDragging(false);
      if (lensMovedRef.current) {
        // A real drag retracts the lens into the cursor; it re-arms on re-entry.
        lensModeRef.current = 'dismissed';
        setLensScale(0, LENS_RETRACT_MS);
        startLensLoop();
      } else {
        // A plain click leaves the lens hovering in place.
        lensModeRef.current = 'visible';
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', endLensDrag);
    window.addEventListener('pointercancel', endLensDrag);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endLensDrag);
      window.removeEventListener('pointercancel', endLensDrag);
      cancelAnimationFrame(lensRafRef.current);
      lensRafRef.current = 0;
      document.body.style.userSelect = '';
    };
  }, []);

  return (
    <section
      id="home"
      ref={heroSectionRef}
      style={{
        position: 'relative',
        paddingTop: '24px',
        paddingBottom: '96px',
        overflow: 'hidden',
      }}
    >
      <div
        className="nudge-container"
        style={{
          position: 'relative',
          minHeight: '720px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* 1. Live Digital Clock (frame_005 y=136) */}
        <div
          ref={clockRef}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            color: '#111111',
            marginBottom: '44px',
            textAlign: 'center',
          }}
        >
          {''}
        </div>

        {/* 2. Handwritten Kicker ('working title is' / 'my name is' from frame_005) */}
        <div
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: '30px',
            fontWeight: 600,
            color: '#111111',
            marginBottom: '26px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 5,
          }}
        >
          <span>working title is</span>
          <HandUnderline width={118} />
        </div>

        {/* 3. Main Interactive Hero Stage with Difference-Blend Inversion Lens (frame_011, frame_015) */}
        <div
          onPointerEnter={handleStagePointerEnter}
          onPointerMove={handleStagePointerMove}
          onPointerLeave={handleStagePointerLeave}
          onPointerDown={handleStagePointerDown}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '780px',
            marginBottom: '34px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: isLensDragging ? 'grabbing' : 'grab',
          }}
        >
          {/* Top-Left Tilted Mint Ribbon (-13 deg on desktop, clean row on mobile) */}
          <div
            className="hero-ribbon hero-ribbon--left"
            style={{
              position: 'absolute',
              top: '-38px',
              left: '12px',
              backgroundColor: 'var(--color-green-tint)',
              color: '#111111',
              padding: '11px 22px',
              transform: 'rotate(-13deg)',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              zIndex: 6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
            }}
          >
            Currently: {currentTitleObj.tag}
          </div>

          {/* Top-Right Tilted Pastel Yellow Ribbon (+8 deg on desktop, clean row on mobile) */}
          <div
            className="hero-ribbon hero-ribbon--right"
            style={{
              position: 'absolute',
              top: '-28px',
              right: '10px',
              backgroundColor: 'var(--color-gold-tint)',
              color: '#111111',
              padding: '11px 22px',
              transform: 'rotate(8deg)',
              fontFamily: 'var(--font-sans)',
              fontSize: '15px',
              fontWeight: 500,
              zIndex: 6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
            }}
          >
            7d × 5-Slot Hard Filter • Zero PII
          </div>

          {/* Cyan Selection Bounding Box around QUORUM (750px x 189px in reference) */}
          <SelectionBox
            borderColor="#42D2ED"
            handleFill="#42D2ED"
            handleStroke="#111111"
            handleSize="13px"
            style={{
              width: '100%',
              minHeight: '186px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px 20px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <PixelDisplayHeading
              lines={[currentTitleObj.label]}
              as="h1"
              size="var(--text-display-hero)"
              scrollFade={false}
              color="#111111"
              animateArrival={introCompleted}
              waitingForArrival={!introCompleted}
            />
          </SelectionBox>
        </div>

        {/* 4. Availability / System Status Indicator (frame_005 y=535) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '36px',
          }}
        >
          <span
            aria-hidden="true"
            className="pulse-dot"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-cyan-primary)',
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: '#111111',
            }}
          >
            GROUP-AWARE EVENT RECOMMENDER FOR COLLEGE CLUBS
          </span>
        </div>

        {/* 5. Editorial Value Proposition with Inline Target & Flower SVG Icons (frame_005 y=636) */}
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-hero-sub)',
            fontWeight: 500,
            lineHeight: 1.18,
            letterSpacing: '-0.028em',
            textAlign: 'center',
            color: '#111111',
            maxWidth: '760px',
            marginBottom: '38px',
          }}
        >
          We match <InlineTargetIcon size={42} /> club events &amp; slots
          <br />
          that include everyone <InlineFlowerIcon size={42} />.
        </p>

        {/* 6. Primary CTA Button ('>> LAUNCH DEMO LAB', matching '>> CONTACT ME' in frame_005) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center', marginBottom: '28px' }}>
          <button type="button" className="nudge-cta-btn" onClick={onJumpToDemo}>
            {/* 4 Corner CAD Handles that appear on hover */}
            <span className="cta-cad-handle cta-cad-handle--tl" aria-hidden="true" />
            <span className="cta-cad-handle cta-cad-handle--tr" aria-hidden="true" />
            <span className="cta-cad-handle cta-cad-handle--bl" aria-hidden="true" />
            <span className="cta-cad-handle cta-cad-handle--br" aria-hidden="true" />

            <span className="cta-icon-box" aria-hidden="true">
              <span className="cta-chevron-circle">
                <span className="cta-chevron">&gt;&gt;</span>
              </span>
            </span>
            <span className="cta-label">LAUNCH DEMO LAB</span>
          </button>
        </div>

        {/* 7. Bottom Dark Floating Parameter / Title HUD Pill (frame_005 - frame_009) */}
        <div
          style={{
            marginTop: '8px',
            backgroundColor: '#1E1E1E',
            color: '#FFFFFF',
            borderRadius: '14px',
            padding: '12px 20px',
            display: 'inline-flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18)',
            zIndex: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.06em',
                color: '#AAAAAA',
                textTransform: 'uppercase',
              }}
            >
              MIN AVAILABILITY (FR-006):
            </span>
            <input
              type="range"
              min="20"
              max="90"
              step="5"
              value={thresholdPct}
              aria-label="Minimum Availability Threshold Percentage"
              onChange={(e) => onChangeThreshold(Number(e.target.value))}
              style={{
                width: '110px',
                accentColor: '#42D2ED',
                cursor: 'pointer',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#42D2ED',
                minWidth: '36px',
              }}
            >
              {thresholdPct}%
            </span>
          </div>

          <div style={{ width: '1px', height: '20px', backgroundColor: '#444444' }} className="hide-mobile" />

          {/* Working Title Switcher (prd.md Section 0 & Section 17.3 Open Question #1) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: '#AAAAAA',
                textTransform: 'uppercase',
                marginRight: '4px',
              }}
            >
              TITLE:
            </span>
            {WORKING_TITLES.map((wt) => (
              <button
                key={wt.id}
                type="button"
                onClick={() => onChangeWorkingTitle(wt.id)}
                style={{
                  backgroundColor: workingTitleId === wt.id ? 'var(--color-cyan-primary)' : '#333333',
                  color: workingTitleId === wt.id ? '#111111' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {wt.id}
              </button>
            ))}
          </div>
        </div>

        {/* 8. Peripheral Floating Cursor Badges & Expanding Mini-Avatars (frame_005, frame_019) */}
        {/* Left Floating Avatar Pill (00:13.5 - 00:14.5) */}
        <div
          className="hide-tablet"
          onMouseEnter={() => setLeftAvatarExpanded(true)}
          onMouseLeave={() => setLeftAvatarExpanded(false)}
          onClick={() => setLeftAvatarExpanded(!leftAvatarExpanded)}
          style={{
            position: 'absolute',
            left: '28px',
            top: '340px',
            backgroundColor: '#ABEBF7',
            borderRadius: '32px 32px 32px 6px',
            padding: leftAvatarExpanded ? '10px 22px' : '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              fontWeight: 500,
              color: '#111111',
              maxWidth: leftAvatarExpanded ? '140px' : '0px',
              opacity: leftAvatarExpanded ? 1 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'max-width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
            }}
          >
            no more
          </span>
          <img
            src={organizerAvatar}
            alt="Club organizer mini portrait"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover',
              transform: leftAvatarExpanded ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              fontWeight: 500,
              color: '#111111',
              maxWidth: leftAvatarExpanded ? '160px' : '0px',
              opacity: leftAvatarExpanded ? 1 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'max-width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
            }}
          >
            exam clashes!
          </span>
        </div>

        {/* Right Floating Avatar Pill (00:03.5 - 00:04.5) */}
        <div
          className="hide-tablet"
          onMouseEnter={() => setRightAvatarExpanded(true)}
          onMouseLeave={() => setRightAvatarExpanded(false)}
          onClick={() => setRightAvatarExpanded(!rightAvatarExpanded)}
          style={{
            position: 'absolute',
            right: '32px',
            top: '440px',
            backgroundColor: '#ABEBF7',
            borderRadius: '32px 32px 6px 32px',
            padding: rightAvatarExpanded ? '10px 22px' : '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              fontWeight: 500,
              color: '#111111',
              maxWidth: rightAvatarExpanded ? '140px' : '0px',
              opacity: rightAvatarExpanded ? 1 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'max-width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
            }}
          >
            100% fair to
          </span>
          <img
            src={organizerAvatar}
            alt="Club member mini portrait"
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover',
              transform: rightAvatarExpanded ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '16px',
              fontWeight: 500,
              color: '#111111',
              maxWidth: rightAvatarExpanded ? '160px' : '0px',
              opacity: rightAvatarExpanded ? 1 : 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'max-width 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
            }}
          >
            quiet members!
          </span>
        </div>

        <div className="hide-tablet">
          <CursorBadge
            label="GROUP REC ENGINE"
            bgColor="#E5B433"
            textColor="#111111"
            pointerCorner="top-right"
            rotationDeg={-6}
            float="gold"
            style={{
              position: 'absolute',
              left: 'clamp(24px, 8vw, 175px)',
              bottom: 'clamp(48px, 10vh, 94px)',
              zIndex: 15,
            }}
          />
        </div>

        <div className="hide-tablet">
          <CursorBadge
            label="FAIRNESS-AWARE"
            bgColor="#D0075A"
            textColor="#FFFFFF"
            pointerCorner="top-left"
            rotationDeg={9}
            float="magenta"
            style={{
              position: 'absolute',
              right: 'clamp(32px, 12vw, 240px)',
              top: 'clamp(340px, 52vh, 520px)',
              zIndex: 15,
            }}
          />
        </div>
      </div>

      {/* Interactive White Difference-Blend Inversion Lens (frame_011 & frame_015)
          - 410px x 430px solid #FFFFFF with mix-blend-mode: difference
          - Irises open out of the circle cursor on hover and retracts back into it
          - Pointer-down grabs it; it spring-damps toward the pointer
            (stiffness 180, damping 22) and can be dragged across the hero canvas. */}
      <div
        ref={lensRef}
        aria-hidden="true"
        className="hide-mobile"
        style={{
          position: 'absolute',
          left: '0px',
          top: '0px',
          width: '410px',
          height: '430px',
          backgroundColor: '#FFFFFF',
          mixBlendMode: 'difference',
          pointerEvents: 'none',
          zIndex: 10,
          opacity: 0,
          transform: 'translate3d(0px, 0px, 0) scale(0)',
          // Anchor the iris on the pointer so the box grows out of the cursor dot
          transformOrigin: `${LENS_ANCHOR_X}px ${LENS_ANCHOR_Y}px`,
          willChange: 'transform, opacity',
        }}
      >
        {/* 4 Corner Resize Handles: 10px x 10px solid #111111 with 1.5px solid #FFFFFF border anchored at -5px */}
        <span style={{ position: 'absolute', top: '-5px', left: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', top: '-5px', right: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
        <span style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
      </div>

      <style>{`
        @media (max-width: 809px) {
          .hero-ribbon {
            position: static !important;
            margin-bottom: 10px !important;
            font-size: 13px !important;
            padding: 8px 16px !important;
            transform: rotate(-2deg) !important;
          }
          .hero-ribbon--right {
            transform: rotate(2deg) !important;
            margin-bottom: 14px !important;
          }
        }
      `}</style>
    </section>
  );
}
