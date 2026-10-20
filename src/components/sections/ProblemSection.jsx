import React, { useState, useRef, useEffect } from 'react';
import { SelectionBox } from '../ui/SelectionBox.jsx';
import { PolaroidFrame } from '../ui/PolaroidFrame.jsx';
import { InlineGoldClover, InlineMagentaSpool, SkillGeometricTile } from '../ui/GeometricIcons.jsx';

// Two rows of two capability cards. Each card is paired with a 74x74 instrument box
// that idles on its own rhythm and accelerates when the pair is hovered.
// `cursor` is the multiplayer "YOU" pill colour that this pair activates.
const SKILL_ROWS = [
  [
    {
      id: 'preference',
      label: 'Preference Learning',
      code: 'FR-007 / FR-008',
      bg: '#E5B433',
      text: '#111111',
      tile: 'gold',
      cursor: 'blue',
      desc: 'Predicts p(member, type, slot) ∈ [0,1] from 1–5 ratings & attendance history.',
    },
    {
      id: 'availability',
      label: 'Hard Slot Filter',
      code: 'FR-005 / FR-006',
      bg: '#3BCF81',
      text: '#111111',
      tile: 'green',
      cursor: 'red',
      desc: 'Drops any 7d × 5-slot candidate below the configurable availability threshold.',
    },
  ],
  [
    {
      id: 'aggregation',
      label: 'Fair Aggregation',
      code: 'FR-009 to FR-011',
      bg: '#D0075A',
      text: '#FFFFFF',
      tile: 'magenta',
      cursor: 'green',
      desc: 'Compares Average, Least-Misery, and Fairness-Aware strategies side by side.',
    },
    {
      id: 'explainable',
      label: 'Explainable Top-K',
      code: 'FR-012 to FR-015',
      bg: '#42D2ED',
      text: '#111111',
      tile: 'cyan',
      cursor: 'orange',
      desc: 'Outputs top-3 events with per-member satisfaction & template explanations.',
    },
  ],
];

export function ProblemSection({ organizerPortrait, workspaceDesk, onSelectPillar }) {
  const [hotPillar, setHotPillar] = useState(null);
  const [badgeHover, setBadgeHover] = useState(false);
  const [badgeEnter, setBadgeEnter] = useState(false);
  const [sectionEntered, setSectionEntered] = useState(false);
  const badgeRef = useRef(null);
  const statementRef = useRef(null);
  const irisRef = useRef(null);
  const enterTimerRef = useRef(null);

  // Entrance beat: the badge tips once the first time it scrolls into view.
  useEffect(() => {
    const node = badgeRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setBadgeEnter(true);
          enterTimerRef.current = setTimeout(() => setBadgeEnter(false), 700);
          observer.disconnect();
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, []);

  // Entrance beat: the kicker writes itself in, the statement rises, and the three
  // inline tokens spring into place within it — one orchestrated moment, not a pile
  // of scattered effects.
  useEffect(() => {
    const node = statementRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setSectionEntered(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setSectionEntered(true);
          observer.disconnect();
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The User Research eye looks back at the pointer.
  const handlePairMouseMove = (e, skill) => {
    if (skill.tile !== 'magenta') return;
    const iris = irisRef.current;
    if (!iris) return;
    const tile = e.currentTarget.querySelector('.skill-tile--magenta');
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    const dx = Math.max(-6, Math.min(6, (e.clientX - (rect.left + rect.width / 2)) / 5));
    const dy = Math.max(-3, Math.min(3, (e.clientY - (rect.top + rect.height / 2)) / 7));
    iris.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
  };

  const handlePairMouseLeave = (skill) => {
    setHotPillar(null);
    if (skill.tile === 'magenta' && irisRef.current) {
      irisRef.current.style.transform = '';
    }
  };

  return (
    <section
      id="problem"
      style={{
        position: 'relative',
        paddingTop: '20px',
        paddingBottom: '120px',
        overflow: 'hidden',
      }}
    >
      {/* Full-Width Hand-Drawn Pencil Curve Divider (frame_027 & frame_029) */}
      <svg
        width="100%"
        height="110"
        viewBox="0 0 1900 110"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ display: 'block', marginBottom: '24px' }}
      >
        <path
          d="M-10 98C420 12 1140 -14 1910 38"
          stroke="#9E9E9E"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      <div className={`nudge-container${sectionEntered ? ' is-entered' : ''}`} style={{ position: 'relative' }}>
        {/* Handwritten Kicker ('about me!' -> 'why quorum?' tilted -10 deg at left) */}
        <div
          className="problem-kicker"
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: '26px',
            fontWeight: 600,
            color: '#111111',
            display: 'inline-block',
            marginLeft: '12%',
            marginBottom: '16px',
          }}
        >
          why quorum?
        </div>

        {/* Centered Black Selection Box Badge ('what's up' -> 'the problem', frame_029) */}
        <div ref={badgeRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '44px' }}>
          <div
            onMouseEnter={() => setBadgeHover(true)}
            onMouseLeave={() => setBadgeHover(false)}
            style={{
              transform:
                badgeHover || badgeEnter ? 'rotate(-4deg) scale(1.03)' : 'rotate(0deg)',
              transition: 'transform 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <SelectionBox
              borderColor="#111111"
              handleFill="#FFFFFF"
              handleStroke="#111111"
              handleSize="9px"
              style={{
                padding: '10px 28px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '28px',
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: '#111111',
                }}
              >
                the problem
              </span>
            </SelectionBox>
          </div>
        </div>

        {/* Central Editorial Statement with Inline Photo & Geometric Tokens + Flanking Polaroids (frame_029) */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '68px',
          }}
        >
          {/* Left Flanking Polaroid (-11 deg, lifts toward upright on hover) */}
          <div
            className="polaroid-flank"
            style={{
              position: 'absolute',
              left: '-10px',
              top: '10px',
              zIndex: 2,
            }}
          >
            <PolaroidFrame
              imageSrc={organizerPortrait}
              alt="a club organizer planning an event"
              caption="2026-27"
              rotationDeg={-11}
              lift="left"
              width={224}
            />
          </div>

          {/* Editorial Statement with Inline Photo & Geometric Tokens (prd.md Section 2 & 3) */}
          <h2
            ref={statementRef}
            className="problem-statement"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'clamp(2rem, 3.8vw, 4.25rem)',
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              color: '#111111',
              maxWidth: '1040px',
              margin: '0 auto',
              position: 'relative',
              zIndex: 3,
            }}
          >
            Organizers pick slots by gut feeling{' '}
            <span className="token-enter" style={{ '--enter-delay': '200ms' }}>
              <span className="statement-avatar-tile">
                <img
                  src={organizerPortrait}
                  alt="Club organizer inline thumbnail"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </span>
            </span>{' '}
            while chat polls miss history,{' '}
            <span className="token-enter" style={{ '--enter-delay': '300ms' }}>
              <InlineGoldClover size={48} />
            </span>{' '}
            so Quorum makes every club event decision fair &amp; explainable{' '}
            <span className="token-enter" style={{ '--enter-delay': '400ms' }}>
              <InlineMagentaSpool size={48} />
            </span>
            .
          </h2>

          {/* Right Flanking Polaroid (+9 deg, lifts toward upright on hover) */}
          <div
            className="polaroid-flank"
            style={{
              position: 'absolute',
              right: '-10px',
              top: '20px',
              zIndex: 2,
            }}
          >
            <PolaroidFrame
              imageSrc={workspaceDesk}
              alt="organizer workspace desk"
              caption="club workspace"
              rotationDeg={9}
              lift="right"
              width={224}
            />
          </div>
        </div>

        {/* Tablet/Mobile Polaroid Row (visible when flanking Polaroids hide on smaller screens) */}
        <div
          className="polaroid-mobile-row"
          style={{
            justifyContent: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            marginBottom: '48px',
          }}
        >
          <PolaroidFrame
            imageSrc={organizerPortrait}
            alt="a club organizer planning an event"
            caption="2026-27"
            rotationDeg={-5}
            lift="left"
            width={175}
          />
          <PolaroidFrame
            imageSrc={workspaceDesk}
            alt="organizer workspace desk"
            caption="club workspace"
            rotationDeg={5}
            lift="right"
            width={175}
          />
        </div>

        {/* 2x2 Colored Capability Cards, each paired with a 74x74 Animated Instrument Box (frame_030) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {SKILL_ROWS.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              {row.map((skill) => {
                const hot = hotPillar === skill.id;
                return (
                  <div
                    key={skill.id}
                    data-cursor-color={skill.cursor}
                    onMouseEnter={() => setHotPillar(skill.id)}
                    onMouseLeave={() => handlePairMouseLeave(skill)}
                    onMouseMove={(e) => handlePairMouseMove(e, skill)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectPillar && onSelectPillar(skill.id)}
                      title={`${skill.code}: ${skill.desc}`}
                      style={{
                        height: '74px',
                        padding: '0 28px',
                        backgroundColor: skill.bg,
                        color: skill.text,
                        border: 'none',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'clamp(1.35rem, 2.1vw, 2.25rem)',
                        fontWeight: 500,
                        letterSpacing: '-0.02em',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        transform: hot ? 'translateY(-3px)' : 'translateY(0)',
                        transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    >
                      <span>{skill.label}</span>
                      <span className="skill-card-code">{skill.code}</span>
                    </button>
                    <SkillGeometricTile
                      variant={skill.tile}
                      hot={hot}
                      irisRef={skill.tile === 'magenta' ? irisRef : undefined}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
