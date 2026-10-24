import React from 'react';
import { DAYS_OF_WEEK, TIME_SLOTS, EVENT_TYPES, AGGREGATION_STRATEGIES, PREFERENCE_MODELS } from '../../../config/siteConfig.js';
import { SelectionBox } from '../../ui/SelectionBox.jsx';

export function ConfigZone({
  strategy,
  onChangeStrategy,
  modelType,
  onChangeModelType,
  thresholdPct,
  onChangeThresholdPct,
  topK,
  setTopK,
  excludedTypes,
  setSelectedRecIndex,
  pipelineOutput,
  toggleTypeExclusion,
}) {
  return (
              <div id="demo-zone-config">
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'var(--color-magenta-primary)',
                    color: '#FFFFFF',
                    padding: '6px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    marginBottom: '12px',
                  }}
                >
                  STEP 02 • GROUP AGGREGATION, HARD FILTER &amp; WEEKLY 7×5 GRID
                </div>

                <SelectionBox
                  borderColor="#D0075A"
                  handleFill="#FFFFFF"
                  handleStroke="#D0075A"
                  handleSize="12px"
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '32px',
                  }}
                >
                  {/* Strategy Selector (FR-009, FR-010, FR-011) */}
                  <div style={{ marginBottom: '28px' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        color: '#555555',
                        marginBottom: '10px',
                      }}
                    >
                      CHOOSE GROUP AGGREGATION STRATEGY (MODULE D):
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {AGGREGATION_STRATEGIES.map((strat) => {
                        const active = strategy === strat.id;
                        return (
                          <button
                            key={strat.id}
                            type="button"
                            onClick={() => {
                              onChangeStrategy(strat.id);
                              setSelectedRecIndex(0);
                            }}
                            style={{
                              textAlign: 'left',
                              padding: '16px',
                              backgroundColor: active ? '#111111' : '#F6F6F6',
                              color: active ? '#FFFFFF' : '#111111',
                              border: '1.5px solid #111111',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                marginBottom: '6px',
                                color: active ? strat.badgeColor : '#555555',
                              }}
                            >
                              <span>{strat.code}</span>
                              <span>{active ? '● ACTIVE' : 'SELECT'}</span>
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '18px',
                                fontWeight: 600,
                                marginBottom: '6px',
                              }}
                            >
                              {strat.name}
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                opacity: 0.85,
                                marginBottom: '8px',
                              }}
                            >
                              {strat.formula}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.88, lineHeight: 1.4 }}>
                              {strat.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preference Model + Threshold + Top-K Controls Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '20px',
                      padding: '20px',
                      backgroundColor: '#F8F8F8',
                      border: '1px solid #E5E5E5',
                      marginBottom: '28px',
                    }}
                  >
                    {/* Preference Model / Baseline Selector (FR-007 & FR-008) */}
                    <div>
                      <label
                        htmlFor="model-select"
                        style={{
                          display: 'block',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        PREFERENCE MODEL / BASELINE:
                      </label>
                      <select
                        id="model-select"
                        value={modelType}
                        onChange={(e) => onChangeModelType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12.5px',
                          border: '1.5px solid #111111',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        {PREFERENCE_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Hard Availability Filter Slider (FR-006) */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        <span>HARD AVAILABILITY FILTER:</span>
                        <span style={{ color: '#D0075A', fontWeight: 700 }}>≥ {thresholdPct}% FREE</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="95"
                        step="5"
                        value={thresholdPct}
                        aria-label="Hard Availability Filter Threshold"
                        onChange={(e) => onChangeThresholdPct(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#D0075A', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => onChangeThresholdPct(50)}
                          style={{
                            padding: '3px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            border: '1px solid #111111',
                            backgroundColor: thresholdPct === 50 ? '#111111' : '#FFFFFF',
                            color: thresholdPct === 50 ? '#FFFFFF' : '#111111',
                            cursor: 'pointer',
                          }}
                        >
                          50% Default
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeThresholdPct(80)}
                          style={{
                            padding: '3px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            border: '1px solid #111111',
                            backgroundColor: thresholdPct === 80 ? '#111111' : '#FFFFFF',
                            color: thresholdPct === 80 ? '#FFFFFF' : '#111111',
                            cursor: 'pointer',
                          }}
                        >
                          80% Strict
                        </button>
                        <button
                          type="button"
                          onClick={() => onChangeThresholdPct(95)}
                          style={{
                            padding: '3px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            border: '1px solid #D0075A',
                            backgroundColor: thresholdPct === 95 ? '#D0075A' : '#FFFFFF',
                            color: thresholdPct === 95 ? '#FFFFFF' : '#D0075A',
                            cursor: 'pointer',
                          }}
                        >
                          95% (Test Fallback!)
                        </button>
                      </div>
                    </div>

                    {/* Top-K & What-If Event Type Toggles (FR-012 & P2) */}
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        WHAT-IF EVENT FILTER (P2) &amp; TOP-K:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {EVENT_TYPES.map((et) => {
                          const included = !excludedTypes.includes(et.id);
                          return (
                            <button
                              key={et.id}
                              type="button"
                              onClick={() => toggleTypeExclusion(et.id)}
                              style={{
                                padding: '5px 8px',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '10.5px',
                                border: '1px solid #111111',
                                backgroundColor: included ? et.color : '#EAEAEA',
                                color: '#111111',
                                opacity: included ? 1 : 0.5,
                                textDecoration: included ? 'none' : 'line-through',
                                cursor: 'pointer',
                              }}
                            >
                              {et.icon} {et.id.toUpperCase()}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setTopK(topK === 3 ? 5 : 3)}
                          style={{
                            padding: '5px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            border: '1px solid #111111',
                            backgroundColor: '#111111',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                        >
                          K={topK}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 7 Days x 5 Slots Weekly Availability Heatmap (FR-005) */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                        WEEKLY AVAILABILITY GRID (7 DAYS × 5 SLOTS = 35 SLOTS):
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#555555' }}>
                        Green cells pass ≥{thresholdPct}% filter • Gray cells dropped by the hard availability filter
                      </span>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11.5px',
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                padding: '8px 10px',
                                border: '1px solid #CCCCCC',
                                backgroundColor: '#111111',
                                color: '#FFFFFF',
                                textAlign: 'left',
                              }}
                            >
                              SLOT \ DAY
                            </th>
                            {DAYS_OF_WEEK.map((d) => (
                              <th
                                key={d}
                                style={{
                                  padding: '8px 10px',
                                  border: '1px solid #CCCCCC',
                                  backgroundColor: '#F1F1F1',
                                  textAlign: 'center',
                                }}
                              >
                                {d.toUpperCase()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((slot) => (
                            <tr key={slot.id}>
                              <td
                                style={{
                                  padding: '8px 10px',
                                  border: '1px solid #CCCCCC',
                                  backgroundColor: '#FAFAFA',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {slot.short} <span style={{ color: '#777777', fontSize: '10px' }}>({slot.window})</span>
                              </td>
                              {DAYS_OF_WEEK.map((day) => {
                                const cell = pipelineOutput.slotGrid.find(
                                  (c) => c.day === day && c.slotId === slot.id
                                );
                                const passes = cell && cell.passesFilter && cell.availableCount > 0;
                                const hasAny = cell && cell.availableCount > 0;
                                return (
                                  <td
                                    key={`${day}-${slot.id}`}
                                    style={{
                                      padding: '8px 6px',
                                      border: '1px solid #CCCCCC',
                                      textAlign: 'center',
                                      backgroundColor: passes
                                        ? '#A6E3C4'
                                        : hasAny
                                        ? '#F9E8EC'
                                        : '#F5F5F5',
                                      color: passes ? '#111111' : hasAny ? '#9E2A4D' : '#AAAAAA',
                                      fontWeight: passes ? 700 : 400,
                                    }}
                                  >
                                    {cell ? `${cell.availableCount}/${cell.totalMembers} (${cell.availPct}%)` : '0%'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </SelectionBox>
              </div>
  );
}
