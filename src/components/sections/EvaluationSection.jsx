import React, { useState, useMemo } from 'react';
import { runSeededEvaluationHarness } from '../../utils/recommenderEngine.js';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { CursorBadge } from '../ui/CursorBadge.jsx';
import { StickyNote } from '../ui/StickyNote.jsx';
import { HandUnderline } from '../ui/GeometricIcons.jsx';

// Full-Width Jagged Vector Polyline Divider with 8x8 Black Vertex Handles (frame_058 - frame_062)
function JaggedVectorBoundary({ fillBelow = '#ABEBF7', fillAbove = '#FFFFFF' }) {
  const points = [
    { x: 0, y: 58 },
    { x: 268, y: 12 },
    { x: 625, y: 62 },
    { x: 1095, y: 20 },
    { x: 1472, y: 60 },
    { x: 1900, y: 8 },
  ];

  const polygonPoints = `0,75 ${points.map((p) => `${p.x},${p.y}`).join(' ')} 1900,75`;
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div style={{ width: '100%', backgroundColor: fillAbove, lineHeight: 0, overflow: 'hidden' }} aria-hidden="true">
      <svg width="100%" height="75" viewBox="0 0 1900 75" preserveAspectRatio="none" style={{ display: 'block' }}>
        <polygon points={polygonPoints} fill={fillBelow} />
        <polyline points={polylinePoints} fill="none" stroke="#111111" strokeWidth="2.5" />
        {points.map((pt, i) => (
          <rect
            key={i}
            x={pt.x - 5}
            y={pt.y - 5}
            width="10"
            height="10"
            fill="#111111"
          />
        ))}
      </svg>
    </div>
  );
}

export function EvaluationSection({ onLoadClubRegime }) {
  const [seed, setSeed] = useState(42);
  const harnessData = useMemo(() => runSeededEvaluationHarness(seed), [seed]);

  // 3 Smartphone-Bezel Process / Simulation Regime Cards (Discover / Define / Design from frame_062 - frame_063)
  const phoneCards = [
    {
      step: 'STEP 01',
      title: 'Homogeneous',
      subtitle: 'High member consensus (σ² < 0.04). Average, Least-Misery, and Fairness-Aware converge on the same top workshop slot.',
      bg: '#ABEBF7',
      badgeBg: '#42D2ED',
      clubId: 'CLUB-02',
      metricCallout: 'Min Sat: 82% • Gini: 0.06',
    },
    {
      step: 'STEP 02',
      title: 'Mixed Club',
      subtitle: 'Moderate preference diversity during midterm exam week. Hard availability filter prunes 71% of colliding slots.',
      bg: '#F2DEA3',
      badgeBg: '#E5B433',
      clubId: 'CLUB-03',
      metricCallout: 'Min Sat: 74% • Gini: 0.08',
    },
    {
      step: 'STEP 03',
      title: 'Conflicting',
      subtitle: 'Polarized sub-factions (Builders vs Seminar fans). Least-Misery & Fairness-Aware boost minimum satisfaction by +30 pts over Average!',
      bg: '#F6B6D0',
      badgeBg: '#D0075A',
      clubId: 'CLUB-01',
      metricCallout: 'Min Sat: 72% vs 42% (Avg)',
    },
  ];

  return (
    <section id="evaluation" style={{ position: 'relative' }}>
      {/* Top Handwritten Kicker ('My services' -> 'Academic rigor', frame_058) */}
      <div style={{ textAlign: 'center', paddingTop: '24px', paddingBottom: '12px' }}>
        <div
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: '26px',
            fontWeight: 600,
            color: '#111111',
            display: 'inline-block',
          }}
        >
          <span>academic evaluation</span>
          <HandUnderline width={130} />
        </div>
      </div>

      {/* Jagged Polyline Transition #1: White Canvas -> Pastel Cyan Band (#ABEBF7, frame_058 & frame_059) */}
      <JaggedVectorBoundary fillAbove="#FFFFFF" fillBelow="#ABEBF7" />

      <div
        style={{
          backgroundColor: 'var(--color-cyan-tint)',
          paddingTop: '36px',
          paddingBottom: '72px',
        }}
      >
        <div className="nudge-container">
          {/* Circular Number Badge (01) + Display Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '48px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: '1.5px solid #111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                marginBottom: '20px',
              }}
            >
              (01)
            </div>

            <PixelDisplayHeading
              lines={['EVALUATION', 'HARNESS']}
              as="h2"
              size="var(--text-display-section)"
              scrollFade={false}
            />

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '17px',
                color: '#111111',
                textAlign: 'center',
                maxWidth: '520px',
                marginTop: '16px',
                lineHeight: 1.5,
              }}
            >
              Temporal train/test split &amp; seeded synthetic simulation comparing all 3 aggregation strategies against 3 baselines (FR-016 to FR-018).
            </p>
          </div>

          {/* 5 Folder-Tab Metric Pills in a 3-Column Grid (frame_059) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '22px',
              marginBottom: '48px',
            }}
          >
            {[
              { name: 'ATTENDANCE MAE / RMSE', val: '0.74 / 0.91 (BEATS BASELINES)' },
              { name: 'TEMPORAL HIT@K (K=3)', val: '84.0% HISTORICAL AGREEMENT' },
              { name: 'MIN-MEMBER SATISFACTION', val: '0.72 ON CONFLICTING CLUBS' },
              { name: 'SATISFACTION GINI / VAR', val: '0.07 INEQUALITY INDEX' },
              { name: 'LATENCY (200 MEMBERS)', val: '< 0.18s (TARGET < 2.0s NFR-1)' },
            ].map((m) => (
              <div
                key={m.name}
                className="service-folder-bar"
                style={{
                  backgroundColor: 'var(--color-cyan-primary)',
                  color: '#111111',
                }}
              >
                <span style={{ fontWeight: 700 }}>{m.name}</span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>{m.val}</span>
              </div>
            ))}
          </div>

          {/* Reproducible Benchmark Table (FR-017 & FR-018) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #111111',
              padding: '28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '18px',
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#555555', marginBottom: '4px' }}>
                  REPRODUCIBLE CLI COMMAND (FR-018):
                </div>
                <code
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#111111',
                    color: '#42D2ED',
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                  }}
                >
                  $ {harnessData.command}
                </code>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                  PRNG SEED (FR-016):
                </span>
                {[42, 7, 2026].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeed(s)}
                    style={{
                      padding: '6px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: '1.5px solid #111111',
                      backgroundColor: seed === s ? '#111111' : '#FFFFFF',
                      color: seed === s ? '#FFFFFF' : '#111111',
                      cursor: 'pointer',
                    }}
                  >
                    seed={s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12.5px',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#111111', color: '#FFFFFF' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>METHOD / STRATEGY</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>TYPE</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>ATTENDANCE MAE ↓</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>RMSE ↓</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>HIT@3 ↑</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>MIN SAT (HOMO) ↑</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>MIN SAT (CONFLICT) ↑</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>GINI ↓</th>
                  </tr>
                </thead>
                <tbody>
                  {harnessData.rows.map((row) => (
                    <tr
                      key={row.method}
                      style={{
                        backgroundColor: row.isHighlight ? '#E6F9FD' : '#FFFFFF',
                        borderBottom: '1px solid #E0E0E0',
                        fontWeight: row.isHighlight ? 700 : 400,
                      }}
                    >
                      <td style={{ padding: '12px', color: '#111111' }}>{row.method}</td>
                      <td style={{ padding: '12px', color: '#555555' }}>{row.family}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{row.mae}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{row.rmse}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{row.hitAt3}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{row.homoMinSat}</td>
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          color: Number(row.conflictMinSat) >= 0.65 ? '#0D7A43' : '#111111',
                          fontWeight: 700,
                        }}
                      >
                        {row.conflictMinSat}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{row.giniInequality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Jagged Polyline Transition #2: Pastel Cyan (#ABEBF7) -> White Canvas */}
      <JaggedVectorBoundary fillAbove="#ABEBF7" fillBelow="#FFFFFF" />

      {/* 3 Smartphone-Bezel Simulation Regime Cards (Discover / Define / Design from frame_062 - frame_063) */}
      <div style={{ paddingTop: '84px', paddingBottom: '110px' }}>
        <div className="nudge-container">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: '24px',
              marginBottom: '56px',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: '#555555', marginBottom: '8px' }}>
                SYNTHETIC CONFLICT GENERATOR (FR-016 &amp; SECTION 12.3)
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'clamp(2rem, 3.4vw, 3.25rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                }}
              >
                Three Synthetic Club Regimes
              </h3>
            </div>

            <StickyNote tint="yellow" rotationDeg={2} padding="16px 22px" maxWidth="480px">
              <strong>Section 12.3 Evaluation Caveat:</strong> Logged events reflect past organizer intuition, not ground-truth optimality. Simulation across these 3 regimes proves where Fairness-Aware &amp; Least-Misery protect minority members.
            </StickyNote>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '44px',
              justifyItems: 'center',
            }}
          >
            {phoneCards.map((card, i) => (
              <div
                key={card.title}
                style={{
                  width: '100%',
                  maxWidth: '410px',
                  minHeight: '590px',
                  backgroundColor: card.bg,
                  borderRadius: '48px',
                  border: '4px solid #111111',
                  padding: '36px 32px 32px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                {/* Top Smartphone Speaker Notch (frame_063) */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '170px',
                    height: '22px',
                    backgroundColor: '#111111',
                    borderRadius: '0 0 16px 16px',
                  }}
                />

                <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* 90px Line-Art Geometric Circle Icon (frame_063) */}
                  <div
                    aria-hidden="true"
                    style={{
                      width: '88px',
                      height: '88px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #111111',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '28px',
                    }}
                  >
                    {i === 0 && (
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="18" cy="24" r="10" stroke="#111111" strokeWidth="2" fill="#FFFFFF" />
                        <circle cx="30" cy="24" r="10" stroke="#111111" strokeWidth="2" fill="#FFFFFF" />
                        <circle cx="27" cy="22" r="2" fill="#111111" />
                        <circle cx="33" cy="22" r="2" fill="#111111" />
                      </svg>
                    )}
                    {i === 1 && (
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path d="M12 24H38M38 24L31 17M38 24L31 31" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M24 12C29 16 29 32 24 36" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
                      </svg>
                    )}
                    {i === 2 && (
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <path d="M16 32L32 16M20 16H32V28" stroke="#111111" strokeWidth="2.2" strokeLinecap="round" />
                        <circle cx="18" cy="20" r="2.2" fill="#111111" />
                      </svg>
                    )}
                  </div>

                  <h4
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '36px',
                      fontWeight: 500,
                      letterSpacing: '-0.02em',
                      marginBottom: '14px',
                      color: '#111111',
                    }}
                  >
                    {card.title}
                  </h4>

                  <p
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '15px',
                      lineHeight: 1.5,
                      color: '#222222',
                      maxWidth: '290px',
                      marginBottom: '18px',
                    }}
                  >
                    {card.subtitle}
                  </p>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'rgba(255,255,255,0.75)',
                      border: '1px solid #111111',
                      padding: '4px 10px',
                    }}
                  >
                    {card.metricCallout}
                  </span>
                </div>

                {/* Floating STEP 01..03 Cursor Badge overlapping right edge (frame_063) */}
                <div
                  style={{
                    alignSelf: 'flex-end',
                    marginRight: '-26px',
                    marginTop: '12px',
                  }}
                >
                  <CursorBadge
                    label={card.step}
                    bgColor={card.badgeBg}
                    textColor={card.badgeBg === '#D0075A' ? '#FFFFFF' : '#111111'}
                    pointerCorner="top-left"
                    rotationDeg={-6}
                  />
                </div>

                {/* Bottom-Right 60px White Circle Arrow Button (frame_063) */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => onLoadClubRegime(card.clubId)}
                    title={`Load ${card.title} Club in Demo Lab`}
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      border: '2px solid #111111',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      cursor: 'pointer',
                      transition: 'transform 180ms ease, background-color 180ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.08)';
                      e.currentTarget.style.backgroundColor = '#111111';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.color = '#111111';
                    }}
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
