import React, { useState, useRef, useEffect } from 'react';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { SelectionBox } from '../ui/SelectionBox.jsx';
import { RulerBar } from '../layout/RulerBar.jsx';

export function LetsTalkFooter({ organizerAvatar, onJumpToDemo }) {
  const eyesGroupRef = useRef(null);
  const eyeOffsetRef = useRef({ x: 0, y: 0 });
  const eyeTargetRef = useRef({ x: 0, y: 0 });
  const eyeFrameRef = useRef(0);
  const [reactionCount, setReactionCount] = useState(1);
  const [reacted, setReacted] = useState(false);
  const [bannerHovered, setBannerHovered] = useState(false);

  const animateEyes = () => {
    const eyes = eyesGroupRef.current;
    if (!eyes) {
      eyeFrameRef.current = 0;
      return;
    }

    const current = eyeOffsetRef.current;
    const target = eyeTargetRef.current;
    current.x += (target.x - current.x) * 0.2;
    current.y += (target.y - current.y) * 0.2;

    if (Math.abs(target.x - current.x) < 0.08 && Math.abs(target.y - current.y) < 0.08) {
      current.x = target.x;
      current.y = target.y;
      eyeFrameRef.current = 0;
    } else {
      eyeFrameRef.current = requestAnimationFrame(animateEyes);
    }

    eyes.setAttribute('transform', `translate(${current.x.toFixed(2)}, ${current.y.toFixed(2)})`);
  };

  const setEyeTarget = (x, y) => {
    eyeTargetRef.current = { x, y };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      eyeOffsetRef.current = { x, y };
      eyesGroupRef.current?.setAttribute('transform', `translate(${x}, ${y})`);
      return;
    }
    if (!eyeFrameRef.current) eyeFrameRef.current = requestAnimationFrame(animateEyes);
  };

  const handleMouseMove = (e) => {
    if (!eyesGroupRef.current || window.matchMedia('(pointer: coarse)').matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / (rect.width || 1) - 0.5;
    const relY = (e.clientY - rect.top) / (rect.height || 1) - 0.5;
    setEyeTarget(Math.round(relX * 18), Math.round(relY * 14));
  };

  const handleMouseLeave = () => setEyeTarget(0, 0);

  useEffect(() => () => {
    if (eyeFrameRef.current) cancelAnimationFrame(eyeFrameRef.current);
  }, []);

  return (
    <footer
      data-motion-section
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        paddingTop: '48px',
      }}
    >
      <div className="nudge-container">
        {/* Upper Let's Talk 2-Column Split (frame_037) */}
        <div
          className="lets-talk-split"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 46%) minmax(300px, 54%)',
            gap: '64px',
            alignItems: 'center',
            position: 'relative',
            zIndex: 5,
            marginBottom: '-56px',
          }}
        >
          {/* Left Column: Green 4-Leaf Clover Mascot + Overlapping White Comment Card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 440 410"
              fill="none"
              aria-label="Quorum 4-Leaf Clover Mascot"
              style={{ maxWidth: '420px', display: 'block' }}
            >
              <path
                d="M216 68C165 10 62 -10 26 42C-10 94 22 174 88 210C22 252 -4 334 38 380C80 426 168 398 220 340C272 398 358 422 400 374C442 326 410 246 346 206C410 166 436 86 394 40C352 -6 267 12 216 68Z"
                fill="#3BCF81"
                stroke="#111111"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              <g ref={eyesGroupRef} transform="translate(0, 0)">
                <rect x="234" y="102" width="26" height="74" rx="13" transform="rotate(-6 234 102)" fill="#111111" />
                <rect x="282" y="96" width="26" height="74" rx="13" transform="rotate(-6 282 96)" fill="#111111" />
              </g>
            </svg>

            {/* Overlapping White Comment Card (frame_037: 435px wide, lightning bolt reaction pill) */}
            <div
              style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 12px 42px rgba(0, 0, 0, 0.1)',
                border: '1px solid #EEEEEE',
                padding: '22px 24px',
                marginTop: '-34px',
                position: 'relative',
                zIndex: 6,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13.5px',
                  color: '#888888',
                  borderBottom: '1px solid #EEEEEE',
                  paddingBottom: '10px',
                  marginBottom: '14px',
                }}
              >
                Comment • Definition of Done (Section 19)
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <img
                  src={organizerAvatar}
                  alt="Quorum developer avatar"
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                    Quorum Research Team
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14.5px', lineHeight: 1.48, color: '#333333', marginBottom: '12px' }}>
                    All P0 requirements verified end-to-end: anonymized schema validator, 7×5 hard filter, 3 group aggregation strategies, and seeded evaluation harness.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setReacted(!reacted);
                      setReactionCount(reacted ? reactionCount - 1 : reactionCount + 1);
                    }}
                    style={{
                      backgroundColor: 'var(--color-reaction-bg)',
                      border: '1.5px solid var(--color-cyan-primary)',
                      borderRadius: '6px',
                      padding: '5px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#111111',
                      cursor: 'pointer',
                    }}
                  >
                    ⚡ {reactionCount}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: LET'S RANK Display Heading + Summary Paragraph (frame_037) */}
          <div style={{ paddingBottom: '64px' }}>
            <PixelDisplayHeading
              lines={["LET'S", 'RANK']}
              as="h2"
              size="var(--text-display-section)"
              scrollFade={true}
              align="left"
            />
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '17.5px',
                lineHeight: 1.55,
                color: '#222222',
                maxWidth: '480px',
                marginTop: '20px',
              }}
            >
              Built for college club organizers, data-providing members, and course evaluators who want transparent, reproducible group recommendations instead of guesswork.
            </p>
          </div>
        </div>

        {/* Lower 1650px x 520px Rounded Gold / Espresso Diagonal Striped Banner (frame_038 & frame_062) */}
        <div
          className="footer-striped-banner"
          style={{
            width: '100%',
            minHeight: '490px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '84px 24px 48px',
            marginBottom: '64px',
          }}
        >
          {/* Centered Interactive CONTACT / QUORUM Box that Inverts on Hover (frame_038 vs frame_062) */}
          <div
            onMouseEnter={() => setBannerHovered(true)}
            onMouseLeave={() => setBannerHovered(false)}
            onClick={onJumpToDemo}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onJumpToDemo();
              }
            }}
            aria-label="Jump to Interactive Quorum Demo Lab"
            style={{ cursor: 'pointer', maxWidth: '100%' }}
          >
            <SelectionBox
              className="footer-contact-selection"
              borderColor={bannerHovered ? '#FFFFFF' : '#111111'}
              handleFill={bannerHovered ? '#111111' : '#42D2ED'}
              handleStroke={bannerHovered ? '#FFFFFF' : '#111111'}
              handleSize={bannerHovered ? '18px' : '12px'}
              style={{
                backgroundColor: bannerHovered ? '#111111' : 'var(--color-cyan-primary)',
                padding: '20px 32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '24px',
                transition: 'background-color 200ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div
                aria-hidden="true"
                className="hide-mobile"
                style={{
                  width: '84px',
                  height: '84px',
                  backgroundColor: 'var(--color-magenta-primary)',
                  border: '2px solid #111111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#111111',
                    transform: 'rotate(45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      transform: 'rotate(-45deg)',
                      color: 'var(--color-gold-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '20px',
                      fontWeight: 700,
                    }}
                  >
                    &gt;&gt;
                  </span>
                </div>
              </div>

              <PixelDisplayHeading
                lines={['QUORUM']}
                as="span"
                size="clamp(2.2rem, 5.5vw, 5.2rem)"
                scrollFade={false}
                color={bannerHovered ? '#42D2ED' : '#111111'}
              />

              <div
                aria-hidden="true"
                className="hide-mobile"
                style={{
                  width: '84px',
                  height: '84px',
                  backgroundColor: 'var(--color-magenta-primary)',
                  border: '2px solid #111111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#111111',
                    transform: 'rotate(45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      transform: 'rotate(-45deg)',
                      color: 'var(--color-gold-primary)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '20px',
                      fontWeight: 700,
                    }}
                  >
                    &lt;&lt;
                  </span>
                </div>
              </div>
            </SelectionBox>
          </div>
        </div>
      </div>

      <RulerBar position="bottom" />

      <style>{`
        @media (max-width: 900px) {
          .lets-talk-split {
            grid-template-columns: 1fr !important;
            margin-bottom: 24px !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </footer>
  );
}
