import React from 'react';
import { SelectionBox } from '../ui/SelectionBox.jsx';
import { PolaroidFrame } from '../ui/PolaroidFrame.jsx';
import { InlineGoldClover, InlineMagentaSpool, SkillGeometricTile } from '../ui/GeometricIcons.jsx';

export function ProblemSection({ organizerPortrait, workspaceDesk, onSelectPillar }) {
  const pillars = [
    {
      id: 'preference',
      label: 'Preference Learning',
      code: 'FR-007 / FR-008',
      bg: '#E5B433',
      text: '#111111',
      tile: 'gold',
      desc: 'Predicts p(member, type, slot) ∈ [0,1] from 1–5 ratings & attendance history.',
    },
    {
      id: 'availability',
      label: 'Hard Slot Filter',
      code: 'FR-005 / FR-006',
      bg: '#3BCF81',
      text: '#111111',
      tile: 'green',
      desc: 'Drops any 7d × 5-slot candidate below the configurable availability threshold.',
    },
    {
      id: 'aggregation',
      label: 'Fair Aggregation',
      code: 'FR-009 to FR-011',
      bg: '#D0075A',
      text: '#FFFFFF',
      tile: 'magenta',
      desc: 'Compares Average, Least-Misery, and Fairness-Aware strategies side by side.',
    },
    {
      id: 'explainable',
      label: 'Explainable Top-K',
      code: 'FR-012 to FR-015',
      bg: '#42D2ED',
      text: '#111111',
      tile: 'cyan',
      desc: 'Outputs top-3 events with per-member satisfaction & template explanations.',
    },
  ];

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

      <div className="nudge-container" style={{ position: 'relative' }}>
        {/* Handwritten Kicker ('about me!' -> 'why quorum?' tilted -10 deg at left) */}
        <div
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: '28px',
            fontWeight: 600,
            color: '#111111',
            transform: 'rotate(-10deg)',
            display: 'inline-block',
            marginLeft: '12%',
            marginBottom: '16px',
          }}
        >
          why quorum?
        </div>

        {/* Centered Black Selection Box Badge ('what's up' -> 'the problem', frame_029) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '44px' }}>
          <SelectionBox
            borderColor="#111111"
            handleFill="#FFFFFF"
            handleStroke="#111111"
            handleSize="10px"
            style={{
              padding: '12px 32px',
              backgroundColor: '#FFFFFF',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 'clamp(1.5rem, 2.2vw, 2.1rem)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: '#111111',
              }}
            >
              the problem
            </span>
          </SelectionBox>
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
          {/* Left Flanking Polaroid (-11 deg) */}
          <div
            className="hide-tablet"
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
              width={224}
            />
          </div>

          {/* 72px Inline-Media Problem & Opportunity Statement (prd.md Section 2 & 3) */}
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-statement-xl)',
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
            <span
              style={{
                display: 'inline-block',
                width: '56px',
                height: '56px',
                verticalAlign: 'middle',
                overflow: 'hidden',
                border: '1.5px solid #111111',
                margin: '0 4px',
                transform: 'translateY(-4px)',
              }}
            >
              <img
                src={organizerPortrait}
                alt="Club organizer inline thumbnail"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </span>{' '}
            while chat polls miss history,{' '}
            <InlineGoldClover size={52} /> so Quorum makes every club event decision fair &amp; explainable{' '}
            <InlineMagentaSpool size={52} />.
          </h2>

          {/* Right Flanking Polaroid (+9 deg) */}
          <div
            className="hide-tablet"
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
              width={224}
            />
          </div>
        </div>

        {/* Tablet/Mobile Polaroid Row (visible when flanking Polaroids hide on smaller screens) */}
        <div
          className="polaroid-mobile-row"
          style={{
            display: 'none',
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
            width={175}
          />
          <PolaroidFrame
            imageSrc={workspaceDesk}
            alt="organizer workspace desk"
            caption="club workspace"
            rotationDeg={5}
            width={175}
          />
        </div>

        {/* 2x2 Colored Skill / Pillar Blocks with 74x74 Geometric Icon Tiles (frame_030) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Row 1: Preference Learning (Gold) + Hard Slot Filter (Green) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {pillars.slice(0, 2).map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <button
                  type="button"
                  onClick={() => onSelectPillar && onSelectPillar(p.id)}
                  title={`${p.code}: ${p.desc}`}
                  style={{
                    height: '74px',
                    padding: '0 28px',
                    backgroundColor: p.bg,
                    color: p.text,
                    border: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'clamp(1.35rem, 2.1vw, 2.25rem)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>{p.label}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      opacity: 0.78,
                      border: '1px solid currentColor',
                      padding: '2px 6px',
                    }}
                  >
                    {p.code}
                  </span>
                </button>
                <SkillGeometricTile variant={p.tile} />
              </div>
            ))}
          </div>

          {/* Row 2: Fair Aggregation (Magenta) + Explainable Top-K (Cyan) */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {pillars.slice(2, 4).map((p) => (
              <div
                key={p.id}
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <button
                  type="button"
                  onClick={() => onSelectPillar && onSelectPillar(p.id)}
                  title={`${p.code}: ${p.desc}`}
                  style={{
                    height: '74px',
                    padding: '0 28px',
                    backgroundColor: p.bg,
                    color: p.text,
                    border: 'none',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'clamp(1.35rem, 2.1vw, 2.25rem)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <span>{p.label}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      opacity: 0.85,
                      border: '1px solid currentColor',
                      padding: '2px 6px',
                    }}
                  >
                    {p.code}
                  </span>
                </button>
                <SkillGeometricTile variant={p.tile} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .polaroid-mobile-row {
            display: flex !important;
          }
        }
      `}</style>
    </section>
  );
}
