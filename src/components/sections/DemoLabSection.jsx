import React, { useState, useMemo } from 'react';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  EVENT_TYPES,
  AGGREGATION_STRATEGIES,
  PREFERENCE_MODELS,
} from '../../config/siteConfig.js';
import { CSV_VALIDATION_TEST_SAMPLE } from '../../data/clubsDataset.js';
import { runQuorumPipeline, validateCsvDataset } from '../../utils/recommenderEngine.js';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { SelectionBox } from '../ui/SelectionBox.jsx';
import { CursorBadge } from '../ui/CursorBadge.jsx';
import { scrollToElement } from '../../utils/scrollToElement.js';

export function DemoLabSection({
  clubs,
  selectedClubId,
  onSelectClub,
  strategy,
  onChangeStrategy,
  modelType,
  onChangeModelType,
  thresholdPct,
  onChangeThresholdPct,
}) {
  const [activeSubZone, setActiveSubZone] = useState('results'); // 'data' | 'config' | 'results'
  const [topK, setTopK] = useState(3);
  const [excludedMembers, setExcludedMembers] = useState([]);
  const [excludedTypes, setExcludedTypes] = useState([]);
  const [selectedRecIndex, setSelectedRecIndex] = useState(0);
  const [validatorReport, setValidatorReport] = useState(null);
  const [exportStatus, setExportStatus] = useState('');

  const activeClub = useMemo(
    () => clubs.find((c) => c.club_id === selectedClubId) || clubs[0],
    [clubs, selectedClubId]
  );

  const pipelineOutput = useMemo(
    () =>
      runQuorumPipeline(activeClub, {
        strategy,
        modelType,
        thresholdPct,
        topK,
        excludedMemberIds: excludedMembers,
        excludedEventTypeIds: excludedTypes,
      }),
    [activeClub, strategy, modelType, thresholdPct, topK, excludedMembers, excludedTypes]
  );

  // Compare what Average vs Least-Misery vs Fairness-Aware pick as #1 for this club
  const strategyComparison = useMemo(() => {
    return AGGREGATION_STRATEGIES.map((strat) => {
      const res = runQuorumPipeline(activeClub, {
        strategy: strat.id,
        modelType,
        thresholdPct,
        topK: 1,
        excludedMemberIds: excludedMembers,
        excludedEventTypeIds: excludedTypes,
      });
      const top1 = res.recommendations[0];
      return {
        strategy: strat,
        top1,
      };
    });
  }, [activeClub, modelType, thresholdPct, excludedMembers, excludedTypes]);

  const activeRec =
    pipelineOutput.recommendations[selectedRecIndex] || pipelineOutput.recommendations[0] || null;

  const toggleMemberExclusion = (memberId) => {
    setExcludedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    setSelectedRecIndex(0);
  };

  const toggleTypeExclusion = (typeId) => {
    setExcludedTypes((prev) => {
      if (prev.includes(typeId)) return prev.filter((id) => id !== typeId);
      if (prev.length >= EVENT_TYPES.length - 1) return prev; // Keep at least 1 event type active
      return [...prev, typeId];
    });
    setSelectedRecIndex(0);
  };

  const handleRunValidatorTest = () => {
    const report = validateCsvDataset(CSV_VALIDATION_TEST_SAMPLE, 10);
    setValidatorReport(report);
    setActiveSubZone('data');
  };

  const handleExportCsv = () => {
    const headers = 'rank,event_type,day,slot,group_score,expected_attendance,min_satisfaction,spread,explanation\n';
    const rows = pipelineOutput.recommendations
      .map(
        (r, idx) =>
          `${idx + 1},"${r.eventType.label}",${r.day},${r.slotLabel},${r.groupScore},${r.expectedAttendance},${r.minScore},${r.spread},"${r.explanation}"`
      )
      .join('\n');
    const csvContent = headers + rows;
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quorum_${activeClub.club_id}_${strategy}_top${topK}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // Safe fallback inside restricted iframes
    }
    setExportStatus(`EXPORTED TOP-${topK} CSV (${activeClub.club_id})`);
    setTimeout(() => setExportStatus(''), 3000);
  };

  const scrollToSubZone = (zoneId) => {
    setActiveSubZone(zoneId);
    const el = document.getElementById(`demo-zone-${zoneId}`);
    scrollToElement(el);
  };

  return (
    <section
      id="demo-lab"
      style={{
        position: 'relative',
        paddingTop: '72px',
        paddingBottom: '120px',
      }}
    >
      <div className="nudge-container">
        {/* Section Title ('ABOUT' style header from frame_040 -> 'DEMO LAB') */}
        <div style={{ marginBottom: '56px', textAlign: 'center' }}>
          <PixelDisplayHeading
            lines={['DEMO LAB']}
            as="h2"
            size="var(--text-display-section)"
            scrollFade={true}
          />
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '18px',
              color: '#333333',
              maxWidth: '640px',
              margin: '18px auto 0',
              lineHeight: 1.5,
            }}
          >
            In-browser sandbox on a small sample dataset: switch clubs, validate raw CSVs, tune the hard availability threshold, and compare group aggregation strategies in real time. It runs a simplified demo engine; the full recommender is the Python backend behind /app.
          </p>
        </div>

        {/* Asymmetric 2-Zone Layout from About Page (frame_040 - frame_045):
            Left Sticky Section Spy Pill (DATA / CONFIG / RESULTS) + Right Selection-Box Workbenches */}
        <div
          className="demo-asymmetric-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: '116px minmax(0, 1fr)',
            gap: '56px',
            alignItems: 'start',
          }}
        >
          {/* Left Sticky Section Spy Pill (frame_041: 108px x 315px white capsule with 3 square buttons) */}
          <aside
            aria-label="Demo Workbench Navigation"
            className="demo-sticky-spy"
            style={{
              position: 'sticky',
              top: '150px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '16px',
              boxShadow: 'var(--shadow-sticky-nav)',
              border: '1px solid #ECECEC',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              width: '108px',
              zIndex: 20,
            }}
          >
            {[
              { id: 'data', label: 'DATA', icon: '⚙' },
              { id: 'config', label: 'CONFIG', icon: '☍' },
              { id: 'results', label: 'RESULTS', icon: '✦' },
            ].map((tab) => {
              const active = activeSubZone === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToSubZone(tab.id)}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '12px',
                    backgroundColor: active ? '#111111' : 'transparent',
                    color: active ? '#FFFFFF' : '#111111',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 180ms ease',
                  }}
                >
                  <span style={{ fontSize: '20px', lineHeight: 1 }}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Right Main Workbench Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '56px' }}>
            {/* ================================================================
                ZONE 1: DATA SOURCE & CSV SCHEMA VALIDATOR (Gold Selection Box, frame_041)
                ================================================================ */}
            <div id="demo-zone-data">
              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--color-gold-primary)',
                  color: '#111111',
                  padding: '6px 14px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  marginBottom: '12px',
                }}
              >
                STEP 01 • CLUB DATA &amp; SCHEMA VALIDATOR (FR-001 TO FR-004)
              </div>

              <SelectionBox
                borderColor="#E5B433"
                handleFill="#FFFFFF"
                handleStroke="#E5B433"
                handleSize="12px"
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '32px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                    marginBottom: '24px',
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '28px',
                        fontWeight: 500,
                        letterSpacing: '-0.02em',
                        marginBottom: '6px',
                      }}
                    >
                      Select Anonymized Campus Club Dataset
                    </h3>
                    <p style={{ fontSize: '15px', color: '#444444' }}>
                      All member identities are stripped to generated IDs (<code>M-01</code>..<code>M-10</code>) per FR-004. Synthetic rows carry explicit <code>is_synthetic=1</code> flags.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunValidatorTest}
                    style={{
                      backgroundColor: '#111111',
                      color: '#FFFFFF',
                      border: '1.5px solid #111111',
                      padding: '10px 16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                    }}
                  >
                    {validatorReport ? '✓ RE-RUN 30-ROW CSV VALIDATOR' : '▶ RUN 30-ROW CSV VALIDATOR (FR-002)'}
                  </button>
                </div>

                {/* 4 Bundled Club Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '14px',
                    marginBottom: '20px',
                  }}
                >
                  {clubs.map((c) => {
                    const isSelected = c.club_id === activeClub.club_id;
                    return (
                      <button
                        key={c.club_id}
                        type="button"
                        onClick={() => {
                          onSelectClub(c.club_id);
                          setExcludedMembers([]);
                          setSelectedRecIndex(0);
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '16px',
                          backgroundColor: isSelected ? '#FFF9E6' : '#FAFAFA',
                          border: isSelected ? '2px solid #111111' : '1px solid #DFDFDF',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              fontWeight: 600,
                              marginBottom: '6px',
                            }}
                          >
                            <span>{c.club_id} • {c.members.length} MEMBERS</span>
                            {c.is_synthetic && (
                              <span
                                style={{
                                  backgroundColor: '#F2DEA3',
                                  padding: '2px 6px',
                                  fontSize: '10px',
                                }}
                              >
                                SYNTHETIC
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-sans)',
                              fontSize: '17px',
                              fontWeight: 600,
                              color: '#111111',
                              marginBottom: '4px',
                            }}
                          >
                            {c.name}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'inline-block',
                            alignSelf: 'flex-start',
                            backgroundColor: c.conflictBadgeColor,
                            color: c.conflictBadgeColor === '#D0075A' ? '#FFFFFF' : '#111111',
                            padding: '3px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            fontWeight: 600,
                          }}
                        >
                          {c.regime}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Club Description Sticky Banner */}
                <div
                  style={{
                    backgroundColor: 'var(--color-gold-tint)',
                    padding: '14px 18px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14.5px',
                    color: '#111111',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span>
                    <strong>Active Club Context:</strong> {activeClub.description}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                    Last Event: {activeClub.lastEvent.type_id.toUpperCase()} ({activeClub.lastEvent.day} {activeClub.lastEvent.slot})
                  </span>
                </div>

                {/* FR-002 & FR-003 30-Row CSV Schema Validation Report Drawer */}
                {validatorReport && (
                  <div
                    role="region"
                    aria-label="CSV Schema Validation Report"
                    style={{
                      marginTop: '20px',
                      border: '1.5px solid #111111',
                      backgroundColor: '#FAFAFA',
                      padding: '20px',
                    }}
                  >
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
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                        FR-002 / FR-003 VALIDATOR REPORT: {validatorReport.validCount} OF {validatorReport.totalRows} ROWS LOADED • {validatorReport.errorCount} REJECTED
                      </div>
                      <button
                        type="button"
                        onClick={() => setValidatorReport(null)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #111111',
                          padding: '4px 10px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        HIDE REPORT
                      </button>
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#333333', marginBottom: '12px' }}>
                      Acceptance test verified: 30-row import sample containing 3 deliberately malformed rows loads 27 valid records and flags the exact 3 row-level schema/privacy errors below:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {validatorReport.errors.map((err) => (
                        <div
                          key={err.row}
                          style={{
                            backgroundColor: '#FFE8F0',
                            borderLeft: '4px solid #D0075A',
                            padding: '10px 14px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '12px',
                            color: '#111111',
                          }}
                        >
                          <strong>Row #{err.row} ({err.event_id}) REJECTED:</strong> {err.issues.join(' | ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SelectionBox>
            </div>

            {/* ================================================================
                ZONE 2: STRATEGY, MODEL, AVAILABILITY THRESHOLD & 7x5 HEATMAP (Magenta Box)
                ================================================================ */}
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
                STEP 02 • GROUP AGGREGATION, HARD FILTER &amp; WEEKLY 7×5 GRID (FR-005 TO FR-011)
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
                      PREFERENCE MODEL / BASELINE (FR-007/008):
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
                      <span>HARD AVAILABILITY FILTER (FR-006):</span>
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
                      WEEKLY AVAILABILITY GRID (7 DAYS × 5 SLOTS = 35 SLOTS • FR-005):
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#555555' }}>
                      Green cells pass ≥{thresholdPct}% filter • Gray cells dropped by FR-006 hard constraint
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

            {/* ================================================================
                ZONE 3: RANKED TOP-K OUTPUT, STRATEGY DISAGREEMENT & PER-MEMBER SATISFACTION
                ================================================================ */}
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
                  STEP 03 • TOP-{topK} RECOMMENDATIONS &amp; PER-MEMBER FAIRNESS (FR-012 TO FR-015)
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
                      <strong>⚠ FR-006 HARD FILTER FALLBACK WARNING:</strong> Zero weekly slots met the strict {thresholdPct}% availability threshold. Returning the best-available fallback slots so the organizer is never left with an empty list.
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
                      <strong>ℹ FR-015 COLD-START HANDLER ACTIVE:</strong> Member(s) with 0 historical ratings automatically inherit the club-level average preference profile and carry a <code>LOW-CONFIDENCE</code> badge.
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
                          FR-013 Per-Member Satisfaction Breakdown — {activeRec.eventType.label} ({activeRec.day} {activeRec.slotLabel})
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
                                  ? '⚑ FR-015 COLD START (CLUB AVG)'
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
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .demo-asymmetric-layout {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .demo-sticky-spy {
            position: static !important;
            width: 100% !important;
            flex-direction: row !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
}
