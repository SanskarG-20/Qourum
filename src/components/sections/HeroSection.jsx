import React, { useState, useEffect, useRef } from 'react';
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
  const lensRef = useRef(null);
  const [leftAvatarExpanded, setLeftAvatarExpanded] = useState(false);
  const [rightAvatarExpanded, setRightAvatarExpanded] = useState(false);

  const currentTitleObj = WORKING_TITLES.find((t) => t.id === workingTitleId) || WORKING_TITLES[0];

  useEffect(() => {
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

  const lensPos = useRef({ x: 0, y: 0 });

  const handleHeroMouseMove = (e) => {
    const lens = lensRef.current;
    if (!lens) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - rect.left - 130, -20), rect.width - 240);
    const y = Math.min(Math.max(e.clientY - rect.top - 100, -30), rect.height - 180);
    lensPos.current = { x, y };
    lens.style.opacity = '1';
    lens.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1)`;
  };

  const handleHeroMouseLeave = () => {
    if (lensRef.current) {
      lensRef.current.style.opacity = '0';
      lensRef.current.style.transform = `translate3d(${lensPos.current.x}px, ${lensPos.current.y}px, 0) scale(0.92)`;
    }
  };

  return (
    <section
      id="home"
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
          9:27:15 AM • RS_MINI PROJECT 2026-27
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
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '780px',
            marginBottom: '34px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
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

          {/* Interactive White Difference-Blend Inversion Lens on Hover (frame_011 & frame_015) */}
          <div
            ref={lensRef}
            aria-hidden="true"
            className="hide-mobile"
            style={{
              position: 'absolute',
              left: '0px',
              top: '0px',
              width: '240px',
              height: '190px',
              backgroundColor: '#FFFFFF',
              mixBlendMode: 'difference',
              pointerEvents: 'none',
              zIndex: 10,
              opacity: 0,
              transform: 'scale(0.92)',
              transformOrigin: 'center center',
              transition: 'transform 75ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out',
              willChange: 'transform, opacity',
            }}
          >
            {/* 4 Corner Resize Handles: 10px x 10px solid #111111 with 1.5px solid #FFFFFF border anchored at -5px */}
            <span style={{ position: 'absolute', top: '-5px', left: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', top: '-5px', right: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', bottom: '-5px', left: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '10px', height: '10px', backgroundColor: '#111111', border: '1.5px solid #FFFFFF', boxSizing: 'border-box' }} />
          </div>
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
              width: '13px',
              height: '13px',
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
              fontSize: '15px',
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
              fontSize: '15px',
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
              fontSize: '15px',
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
              fontSize: '15px',
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

        <div
          className="hide-tablet"
          style={{
            position: 'absolute',
            left: '16px',
            bottom: '34px',
          }}
        >
          <CursorBadge
            label="GROUP REC ENGINE"
            bgColor="#E5B433"
            textColor="#111111"
            pointerCorner="top-right"
            rotationDeg={-6}
          />
        </div>

        <div
          className="hide-tablet"
          style={{
            position: 'absolute',
            right: '140px',
            top: '390px',
          }}
        >
          <CursorBadge
            label="FAIRNESS-AWARE"
            bgColor="#D0075A"
            textColor="#FFFFFF"
            pointerCorner="top-left"
            rotationDeg={9}
          />
        </div>
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
