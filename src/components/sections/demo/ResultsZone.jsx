import React from 'react';
import { SelectionBox } from '../../ui/SelectionBox.jsx';
import { CursorBadge } from '../../ui/CursorBadge.jsx';

export function ResultsZone({
  strategy,
  onChangeStrategy,
  thresholdPct,
  topK,
  excludedMembers,
  setExcludedMembers,
  setSelectedRecIndex,
  exportStatus,
  activeClub,
  pipelineOutput,
  strategyComparison,
  activeRec,
  toggleMemberExclusion,
  handleExportCsv,
}) {
  return (
              <div id="demo-zone-results" style={{ position: 'relative' }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'var(--color-cyan-primary)',
                      color: '#111111',
                      padding: '6px 14px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                    }}
                  >
                    STEP 03 • TOP-{topK} RECOMMENDATIONS &amp; PER-MEMBER FAIRNESS
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {exportStatus && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          backgroundColor: '#3BCF81',
                          padding: '5px 10px',
                          fontWeight: 600,
                        }}
                      >
                        {exportStatus}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      style={{
                        backgroundColor: '#111111',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '8px 14px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ⬇ EXPORT TOP-{topK} CSV (P2)
                    </button>
                  </div>
                </div>

                <SelectionBox
                  borderColor="#42D2ED"
                  handleFill="#FFFFFF"
                  handleStroke="#42D2ED"
                  handleSize="12px"
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '32px',
                  }}
                >
                  {/* Boundary & Edge-Case Alert Banners (FR-006, FR-015, Sec 8) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                    {pipelineOutput.fallbackTriggered && (
                      <div
                        role="alert"
                        style={{
                          backgroundColor: '#F2DEA3',
                          border: '2px solid #111111',
                          padding: '12px 16px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12.5px',
                          color: '#111111',
                        }}
                      >
                        <strong>⚠ HARD FILTER FALLBACK WARNING:</strong> Zero weekly slots met the strict {thresholdPct}% availability threshold. Returning the best-available fallback slots so the organizer is never left with an empty list.
                      </div>
                    )}

                    {pipelineOutput.lowConfidenceClub && (
                      <div
                        role="alert"
                        style={{
                          backgroundColor: '#F6B6D0',
                          border: '2px solid #D0075A',
                          padding: '12px 16px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12.5px',
                          color: '#111111',
                        }}
                      >
                        <strong>⚠ SECTION 8 LOW-CONFIDENCE CLUB WARNING:</strong> Active club size ({activeClub.members.length - excludedMembers.length} members) is fewer than 5 members. Statistical aggregation has higher variance.
                      </div>
                    )}

                    {pipelineOutput.hasColdStartMember && (
                      <div
                        style={{
                          backgroundColor: '#E6F9FD',
                          borderLeft: '4px solid #42D2ED',
                          padding: '10px 14px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: '#111111',
                        }}
                      >
                        <strong>ℹ COLD-START HANDLER ACTIVE:</strong> Member(s) with 0 historical ratings automatically inherit the club-level average preference profile and carry a <code>LOW-CONFIDENCE</code> badge.
                      </div>
                    )}
                  </div>

                  {/* Live Strategy Disagreement Strip (US-3: shows how Average vs Least-Misery vs Fairness-Aware differ) */}
                  <div
                    style={{
                      marginBottom: '28px',
                      padding: '16px 20px',
                      backgroundColor: '#F7F7F7',
                      border: '1px solid #E2E2E2',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        marginBottom: '10px',
                      }}
                    >
                      US-3 LIVE STRATEGY COMPARISON — TOP #1 CHOICE ACROSS ALL 3 AGGREGATION FUNCTIONS:
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {strategyComparison.map(({ strategy: st, top1 }) => (
                        <div
                          key={st.id}
                          onClick={() => onChangeStrategy(st.id)}
                          style={{
                            padding: '12px 14px',
                            backgroundColor: strategy === st.id ? '#FFFFFF' : '#EFEFEF',
                            border: strategy === st.id ? `2px solid #111111` : '1px solid #CCCCCC',
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#111111',
                              marginBottom: '4px',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                backgroundColor: st.badgeColor,
                                marginRight: '6px',
                              }}
                            />
                            {st.shortName}
                          </div>
                          {top1 ? (
                            <>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600 }}>
                                {top1.eventType.icon} {top1.eventType.label}
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#444444', marginTop: '2px' }}>
                                {top1.day} {top1.slotLabel} • Score {(top1.groupScore * 100).toFixed(0)}% • Min Sat {(top1.minScore * 100).toFixed(0)}%
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '12px' }}>No candidate</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top-K Ranked Recommendation Cards (FR-012 & FR-014) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(275px, 1fr))',
                      gap: '18px',
                      marginBottom: '36px',
                    }}
                  >
                    {pipelineOutput.recommendations.map((rec, idx) => {
                      const isSelected = activeRec && activeRec.id === rec.id;
                      const rankColors = ['#42D2ED', '#E5B433', '#3BCF81', '#F6B6D0', '#ABEBF7'];
                      const badgeBg = rankColors[idx] || '#EEEEEE';

                      return (
                        <div
                          key={rec.id}
                          onClick={() => setSelectedRecIndex(idx)}
                          style={{
                            border: isSelected ? '2.5px solid #111111' : '1.5px solid #CCCCCC',
                            backgroundColor: isSelected ? '#FFFFFF' : '#FAFAFA',
                            padding: '22px',
                            cursor: 'pointer',
                            position: 'relative',
                            boxShadow: isSelected ? '0 10px 28px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 160ms ease',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '12px',
                            }}
                          >
                            <span
                              style={{
                                backgroundColor: badgeBg,
                                color: '#111111',
                                border: '1.5px solid #111111',
                                padding: '4px 10px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                fontWeight: 700,
                              }}
                            >
                              RANK #{idx + 1}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#111111',
                              }}
                            >
                              {rec.day.toUpperCase()} • {rec.slotLabel.toUpperCase()} ({rec.slotWindow})
                            </span>
                          </div>

                          <h4
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '23px',
                              fontWeight: 600,
                              letterSpacing: '-0.02em',
                              marginBottom: '12px',
                            }}
                          >
                            {rec.eventType.icon} {rec.eventType.label}
                          </h4>

                          {/* Key Quantitative Metrics Strip */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '8px',
                              padding: '10px',
                              backgroundColor: '#F3F3F3',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              marginBottom: '14px',
                            }}
                          >
                            <div>
                              <div style={{ color: '#666666' }}>GROUP SCORE</div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>
                                {(rec.groupScore * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#666666' }}>EXP. TURNOUT</div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111111' }}>
                                {rec.expectedAttendance}/{rec.totalMembers}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: '#666666' }}>MIN SAT (FLOOR)</div>
                              <div
                                style={{
                                  fontSize: '15px',
                                  fontWeight: 700,
                                  color: rec.minScore < 0.45 ? '#D0075A' : '#111111',
                                }}
                              >
                                {(rec.minScore * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>

                          {/* FR-014 Template-Based One-Line Explanation */}
                          <p
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '13.5px',
                              lineHeight: 1.45,
                              color: '#222222',
                              backgroundColor: '#FFFDF5',
                              borderLeft: '3px solid #E5B433',
                              padding: '8px 10px',
                            }}
                          >
                            {rec.explanation}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* FR-013 Per-Member Satisfaction Chart & What-If Member Toggles */}
                  {activeRec && (
                    <div
                      style={{
                        borderTop: '1.5px solid #E5E5E5',
                        paddingTop: '28px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '18px',
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '22px',
                              fontWeight: 600,
                              letterSpacing: '-0.015em',
                            }}
                          >
                            Per-Member Satisfaction Breakdown — {activeRec.eventType.label} ({activeRec.day} {activeRec.slotLabel})
                          </h4>
                          <p style={{ fontSize: '13.5px', color: '#555555', marginTop: '4px' }}>
                            Minimum Satisfaction: <strong>{(activeRec.minScore * 100).toFixed(0)}%</strong> • Group Spread (Max−Min): <strong>{(activeRec.spread * 100).toFixed(0)}%</strong> • Click any member ID below to test What-If exclusion (P2).
                          </p>
                        </div>

                        {excludedMembers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExcludedMembers([])}
                            style={{
                              padding: '6px 12px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11.5px',
                              backgroundColor: '#D0075A',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            ↺ RESET EXCLUDED MEMBERS ({excludedMembers.length})
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {activeClub.members.map((m) => {
                          const isExcluded = excludedMembers.includes(m.member_id);
                          const detail = activeRec.memberBreakdown.find((d) => d.member_id === m.member_id);
                          const isAvail = detail && detail.available;
                          const scorePct = detail && detail.score !== null ? Math.round(detail.score * 100) : null;
                          const isMinMember =
                            isAvail &&
                            detail.score !== null &&
                            Math.abs(detail.score - activeRec.minScore) < 0.005;

                          return (
                            <div
                              key={m.member_id}
                              onClick={() => toggleMemberExclusion(m.member_id)}
                              title="Click to toggle What-If exclusion for this member"
                              style={{
                                padding: '12px 14px',
                                border: isMinMember ? '2px solid #D0075A' : '1px solid #DDDDDD',
                                backgroundColor: isExcluded ? '#F2F2F2' : '#FFFFFF',
                                opacity: isExcluded ? 0.52 : 1,
                                cursor: 'pointer',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  marginBottom: '6px',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '12px',
                                }}
                              >
                                <span>
                                  <strong>{m.member_id}</strong> ({m.personaTag})
                                </span>
                                {isExcluded ? (
                                  <span style={{ backgroundColor: '#111111', color: '#FFFFFF', padding: '2px 6px', fontSize: '10px' }}>
                                    EXCLUDED (WHAT-IF)
                                  </span>
                                ) : !isAvail ? (
                                  <span style={{ backgroundColor: '#EEEEEE', color: '#555555', padding: '2px 6px', fontSize: '10px' }}>
                                    UNAVAILABLE (NOT SCORED)
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: 700, color: '#111111' }}>
                                    {scorePct}% ({detail.score.toFixed(2)})
                                  </span>
                                )}
                              </div>

                              {/* Accessible Bar + Text Status (Does not rely on color alone per Section 10) */}
                              <div
                                style={{
                                  width: '100%',
                                  height: '12px',
                                  backgroundColor: '#EEEEEE',
                                  overflow: 'hidden',
                                  marginBottom: '6px',
                                }}
                              >
                                {!isExcluded && isAvail && scorePct !== null && (
                                  <div
                                    style={{
                                      width: `${scorePct}%`,
                                      height: '100%',
                                      backgroundColor:
                                        scorePct >= 75
                                          ? '#3BCF81'
                                          : scorePct >= 55
                                          ? '#42D2ED'
                                          : '#D0075A',
                                    }}
                                  />
                                )}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '10.5px',
                                  color: '#666666',
                                }}
                              >
                                <span>
                                  {detail && detail.isColdStart
                                    ? '⚑ COLD START (CLUB AVG)'
                                    : `Past Events: ${m.pastEventsAttended} • Fairness Wt: ${m.historyWeight}x`}
                                </span>
                                {isMinMember && (
                                  <span style={{ color: '#D0075A', fontWeight: 700 }}>
                                    ★ LEAST-MISERY FLOOR
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </SelectionBox>

                {/* Decorative Right Cursor Tag matching 'MY WORK' on About Timeline (frame_045) */}
                <div
                  className="hide-tablet"
                  style={{
                    position: 'absolute',
                    right: '-24px',
                    top: '-18px',
                    zIndex: 8,
                  }}
                >
                  <CursorBadge
                    label="LIVE ENGINE"
                    bgColor="#42D2ED"
                    textColor="#111111"
                    pointerCorner="top-left"
                    rotationDeg={-7}
                  />
                </div>
              </div>
  );
}
