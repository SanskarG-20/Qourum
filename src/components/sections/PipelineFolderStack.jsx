import React, { useState } from 'react';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { StickyNote } from '../ui/StickyNote.jsx';
import { SelectionBox } from '../ui/SelectionBox.jsx';
import { HandUnderline, NavTabIcon } from '../ui/GeometricIcons.jsx';
import { scrollToElement } from '../../utils/scrollToElement.js';

export function PipelineFolderStack({ mediaAssets, onInspectModuleInDemo }) {
  const [activeOverlayCard, setActiveOverlayCard] = useState({});

  const toggleCardView = (cardId) => {
    setActiveOverlayCard((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // 4 Sticky Folder-Tab Cards matching frame_033 - frame_035 in ui rs.mp4
  const cards = [
    {
      id: 'mod-01',
      tabLabel: 'MODULE 01',
      tabLeft: '0%',
      tabWidth: '25.5%',
      flushLeft: true,
      reqCode: 'FR-001 TO FR-004 • MODULE A',
      title: 'Schema & Anonymization',
      hook: 'When survey responses and attendance logs validate cleanly without storing a single name, email, or roll number.',
      ctaText: 'TEST CSV VALIDATOR ↗',
      demoTargetTab: 'validator',
      bgColor: '#42D2ED',
      textColor: '#111111',
      subTextColor: '#1F2D33',
      pillBg: '#FFFFFF',
      pillText: '#111111',
      tags: ['ZERO PII (FR-004)', 'ROW-LEVEL VALIDATOR'],
      selectionBorder: '#111111',
      handleFill: '#42D2ED',
      handleStroke: '#111111',
      fileBadgeBg: '#111111',
      fileBadgeText: '#42D2ED',
      fileBadgeLabel: 'CSV SCHEMA.PY',
      imageSrc: mediaAssets.card01CampusBlue,
      imageAlt: 'a group of students collaborating on a blue campus court',
      technicalSpecs: [
        'Entities: Club (1:N Member, 1:N Event), Rating (1–5 int), Availability (0/1), Attendance (0/1)',
        'FR-002 Import Acceptance: 30-row sample with 3 bad rows loads 27 valid rows & reports 3 errors',
        'FR-004 Privacy Guarantee: Automated regex scan blocks emails, names, or roll numbers before modeling',
      ],
    },
    {
      id: 'mod-02',
      tabLabel: 'MODULE 02',
      tabLeft: '21.5%',
      tabWidth: '26.5%',
      flushLeft: false,
      reqCode: 'FR-005 TO FR-008 • MODULES B & C',
      title: 'Hard Filter & Preference Model',
      hook: 'From "When is everyone free?" to predicting p(member, type, slot) ∈ [0,1] while dropping impossible exam-week slots.',
      ctaText: 'CONFIGURE FILTER & MODEL ↗',
      demoTargetTab: 'config',
      bgColor: '#111111',
      textColor: '#FFFFFF',
      subTextColor: '#CCCCCC',
      pillBg: '#FFFFFF',
      pillText: '#111111',
      tags: ['7D × 5-SLOT GRID', 'HYBRID MF + BASELINES'],
      selectionBorder: '#FFFFFF',
      handleFill: '#111111',
      handleStroke: '#FFFFFF',
      fileBadgeBg: '#FFFFFF',
      fileBadgeText: '#111111',
      fileBadgeLabel: 'PY MODEL.PY',
      imageSrc: mediaAssets.card02StudyRoom,
      imageAlt: 'a student thinking near sunlit windows and indoor plants',
      technicalSpecs: [
        'Weekly Grid (FR-005): 7 days × 5 slots (Morning, Midday, Afternoon, Evening, Late Evening)',
        'Hard Filter (FR-006): Drops slots below configurable threshold (default 50%) with automatic fallback banner',
        'Baselines (FR-007): Random, Most-Popular, and Repeat-Last evaluated on identical metrics',
      ],
    },
    {
      id: 'mod-03',
      tabLabel: 'MODULE 03',
      tabLeft: '44.5%',
      tabWidth: '26.5%',
      flushLeft: false,
      reqCode: 'FR-009 TO FR-015 • MODULES D & E',
      title: 'Group Aggregation & Fairness',
      hook: 'Helping organizers see exactly who is left behind when Average and Least-Misery disagree on a polarized club.',
      ctaText: 'COMPARE 3 STRATEGIES ↗',
      demoTargetTab: 'results',
      bgColor: '#E5B433',
      textColor: '#111111',
      subTextColor: '#2B2410',
      pillBg: '#FFFFFF',
      pillText: '#111111',
      tags: ['LEAST MISERY (MIN)', 'FAIRNESS-AWARE'],
      selectionBorder: '#111111',
      handleFill: '#E5B433',
      handleStroke: '#111111',
      fileBadgeBg: '#111111',
      fileBadgeText: '#E5B433',
      fileBadgeLabel: 'PY AGGREGATE.PY',
      imageSrc: mediaAssets.card03YellowCourtyard,
      imageAlt: 'two dogs sitting in front of a yellow tiled courtyard with red striped awning',
      technicalSpecs: [
        'FR-009 Average: Mean score over available members (maximizes aggregate utility)',
        'FR-010 Least-Misery: Minimum member score over available members (protects the worst-off attendee)',
        'FR-011 Fairness-Aware: Historical disadvantage weighting minus intra-group variance penalty',
      ],
    },
    {
      id: 'mod-04',
      tabLabel: 'MODULE 04',
      tabLeft: '67.5%',
      tabWidth: '26.5%',
      flushLeft: false,
      reqCode: 'FR-016 TO FR-018 • MODULE F',
      title: 'Seeded Synthetic & Eval Harness',
      hook: 'Reproducible temporal-split benchmarks across Homogeneous, Mixed, and Conflicting synthetic clubs.',
      ctaText: 'RUN SEED=42 HARNESS ↗',
      demoTargetTab: 'evaluation',
      bgColor: '#D0075A',
      textColor: '#FFFFFF',
      subTextColor: '#FFE3EE',
      pillBg: '#FFFFFF',
      pillText: '#111111',
      tags: ['TEMPORAL SPLIT', 'SEED=42 REPRODUCIBLE'],
      selectionBorder: '#FFFFFF',
      handleFill: '#D0075A',
      handleStroke: '#FFFFFF',
      fileBadgeBg: '#FFFFFF',
      fileBadgeText: '#D0075A',
      fileBadgeLabel: 'PY HARNESS.PY',
      imageSrc: mediaAssets.card04SunsetDunes,
      imageAlt: 'a lone figure standing on golden sand dunes',
      technicalSpecs: [
        'FR-016 Synthetic Generator: Controllable conflict parameter with explicit is_synthetic=1 labeling',
        'FR-017 Metrics: Precision@K, NDCG@K, event-type hit rate, Brier score, coverage, diversity, and predicted-satisfaction fairness (Gini)',
        'Sec 12.3 Caveat: Historical events cannot show attendance for options that were never held; results are synthetic and weak evidence',
      ],
    },
  ];

  return (
    <section
      id="pipeline"
      style={{
        position: 'relative',
        paddingTop: '48px',
        paddingBottom: '120px',
      }}
    >
      <div className="nudge-container">
        {/* Section Header ('explore my work! / FEATURED WORKS' -> 'explore the system! / CORE PIPELINE', frame_032) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '64px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-hand)',
              fontSize: '26px',
              fontWeight: 600,
              color: '#111111',
              marginBottom: '18px',
              textAlign: 'center',
            }}
          >
            <span>explore the architecture!</span>
            <HandUnderline width={136} />
          </div>

          <PixelDisplayHeading
            lines={['CORE', 'PIPELINE']}
            as="h2"
            size="var(--text-display-section)"
            scrollFade={true}
          />

          <div style={{ marginTop: '32px' }}>
            <StickyNote
              tint="yellow"
              rotationDeg={-2.5}
              padding="18px 26px"
              maxWidth="390px"
            >
              Four pluggable modules from anonymized survey ingestion to fairness-aware group ranking.
            </StickyNote>
          </div>
        </div>

        {/* Sticky Folder-Tab Project Cards Stack (frame_033 - frame_035) */}
        <div
          className="folder-cards-stack-container"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '80px',
            paddingBottom: '360px',
          }}
        >
          {cards.map((card, index) => {
            const showSpecs = Boolean(activeOverlayCard[card.id]);
            return (
              <article
                key={card.id}
                id={`folder-card-${card.id}`}
                className="folder-card-sticky-wrapper"
                style={{
                  position: 'sticky',
                  top: '96px',
                  zIndex: 10 + index * 2,
                  width: '100%',
                }}
              >
                {/* Staggered Top Chamfered Folder Tab (Transparent row so all 4 tabs remain visible side-by-side!) */}
                <div
                  className="folder-tab-row"
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '68px',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const el = document.getElementById(`folder-card-${card.id}`);
                      scrollToElement(el);
                    }}
                    className={`folder-tab-top ${card.flushLeft ? 'folder-tab-top--flush-left' : ''}`}
                    style={{
                      position: 'absolute',
                      left: card.tabLeft,
                      width: card.tabWidth,
                      height: '68px',
                      backgroundColor: card.bgColor,
                      color: card.textColor,
                      pointerEvents: 'auto',
                      minWidth: '180px',
                    }}
                  >
                    <NavTabIcon type="stairs" />
                    <span style={{ color: card.textColor }}>{card.tabLabel}</span>
                  </div>
                </div>

                {/* Main Folder Card Body */}
                <div
                  style={{
                    backgroundColor: card.bgColor,
                    color: card.textColor,
                    padding: '44px 48px',
                    minHeight: '580px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(280px, 42%) minmax(320px, 58%)',
                    gap: '44px',
                    alignItems: 'center',
                    boxShadow: index > 0 ? '0 -10px 32px rgba(0, 0, 0, 0.16), 0 -2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  }}
                  className="folder-card-grid"
                >
                  {/* Left Metadata & Narrative Column */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      minHeight: '470px',
                    }}
                  >
                    <div>
                      {/* Date / Requirement Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          marginBottom: '22px',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: card.textColor,
                            display: 'inline-block',
                          }}
                        />
                        <span>{card.reqCode}</span>
                      </div>

                      {/* 68px Card Title (Using solid high-contrast text per Section I.2 recommendation) */}
                      <h3
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 'var(--text-project-title)',
                          fontWeight: 500,
                          lineHeight: 1.08,
                          letterSpacing: '-0.03em',
                          marginBottom: '20px',
                          color: card.textColor,
                        }}
                      >
                        {card.title}
                      </h3>

                      {/* 2-Line Hook */}
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '17px',
                          lineHeight: 1.5,
                          color: card.subTextColor,
                          maxWidth: '390px',
                          marginBottom: '34px',
                        }}
                      >
                        {card.hook}
                      </p>

                      {/* Action Links: Inspect in Demo Lab + Toggle Architecture Spec */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onInspectModuleInDemo(card.demoTargetTab)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${card.textColor}`,
                            padding: '0 0 8px 0',
                            color: card.textColor,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '14px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                          }}
                        >
                          {card.ctaText}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleCardView(card.id)}
                          style={{
                            backgroundColor: showSpecs ? card.textColor : 'transparent',
                            color: showSpecs ? card.bgColor : card.textColor,
                            border: `1.5px solid ${card.textColor}`,
                            padding: '6px 12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            cursor: 'pointer',
                          }}
                        >
                          {showSpecs ? 'SHOW PHOTO VIEW' : 'VIEW PRD SPECS'}
                        </button>
                      </div>
                    </div>

                    {/* Bottom-Left Miniature Folder-Tab Category Pills (frame_033 & frame_034) */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginTop: '36px',
                      }}
                    >
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="folder-pill"
                          style={{
                            backgroundColor: card.pillBg,
                            color: card.pillText,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                {/* Right framed image / technical-spec selection box (814x556 in reference) */}
                  <div>
                    <SelectionBox
                      borderColor={card.selectionBorder}
                      handleFill={card.handleFill}
                      handleStroke={card.handleStroke}
                      handleSize="12px"
                      data-cursor-see="Inspect"
                      onClick={() => toggleCardView(card.id)}
                      style={{
                        width: '100%',
                        aspectRatio: '1.46 / 1',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        backgroundColor: '#181818',
                      }}
                    >
                      <img
                        src={card.imageSrc}
                        alt={card.imageAlt}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          filter: showSpecs ? 'brightness(0.22) contrast(1.1)' : 'none',
                          transition: 'filter 240ms ease, transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />

                      {/* Top-Right File Badge ('JPG IMAGE.JPG' -> Module Spec Badge, frame_033) */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '18px',
                          right: '18px',
                          backgroundColor: card.fileBadgeBg,
                          color: card.fileBadgeText,
                          padding: '10px 16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          zIndex: 3,
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: card.fileBadgeText,
                            color: card.fileBadgeBg,
                            padding: '2px 5px',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          PRD
                        </span>
                        <span>{card.fileBadgeLabel}</span>
                      </div>

                      {/* Bottom or Full Interactive PRD Spec Overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: showSpecs ? '0' : 'auto 0 0 0',
                          background: showSpecs
                            ? 'rgba(17, 17, 17, 0.86)'
                            : 'linear-gradient(to top, rgba(17,17,17,0.88) 0%, rgba(17,17,17,0.0) 100%)',
                          color: '#FFFFFF',
                          padding: showSpecs ? '36px 28px' : '24px 20px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: showSpecs ? 'center' : 'flex-end',
                          gap: '12px',
                          transition: 'all 240ms ease',
                        }}
                      >
                        {showSpecs ? (
                          <>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                color: '#42D2ED',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {card.reqCode} — ACCEPTANCE SPECIFICATION
                            </div>
                            {card.technicalSpecs.map((spec, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  padding: '12px 14px',
                                  backgroundColor: 'rgba(255,255,255,0.08)',
                                  borderLeft: '3px solid #42D2ED',
                                  fontFamily: 'var(--font-sans)',
                                  fontSize: '14.5px',
                                  lineHeight: 1.45,
                                }}
                              >
                                {spec}
                              </div>
                            ))}
                          </>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              color: '#F0F0F0',
                            }}
                          >
                            <span>{card.technicalSpecs[0]}</span>
                            <span style={{ color: '#42D2ED', fontWeight: 600, marginLeft: '12px', whiteSpace: 'nowrap' }}>
                              [CLICK FOR SPECS]
                            </span>
                          </div>
                        )}
                      </div>
                    </SelectionBox>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .folder-card-grid {
            grid-template-columns: 1fr !important;
            padding: 28px 24px !important;
            gap: 28px !important;
          }
        }
        @media (max-width: 809px) {
          .folder-tab-row {
            height: 52px !important;
          }
          .folder-tab-top {
            height: 52px !important;
            min-width: 110px !important;
            padding: 0 10px !important;
            font-size: 11px !important;
            clip-path: polygon(18px 0%, calc(100% - 18px) 0%, 100% 100%, 0% 100%) !important;
          }
          .folder-tab-top--flush-left {
            clip-path: polygon(0% 0%, calc(100% - 18px) 0%, 100% 100%, 0% 100%) !important;
          }
        }
      `}</style>
    </section>
  );
}
