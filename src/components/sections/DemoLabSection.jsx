import React, { useState, useMemo } from 'react';
import {
  EVENT_TYPES,
  AGGREGATION_STRATEGIES,
} from '../../config/siteConfig.js';
import { CSV_VALIDATION_TEST_SAMPLE } from '../../data/clubsDataset.js';
import { runQuorumPipeline, validateCsvDataset } from '../../utils/recommenderEngine.js';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { scrollToElement } from '../../utils/scrollToElement.js';
import { DataZone } from './demo/DataZone.jsx';
import { ConfigZone } from './demo/ConfigZone.jsx';
import { ResultsZone } from './demo/ResultsZone.jsx';

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
            <DataZone
              clubs={clubs}
              onSelectClub={onSelectClub}
              setExcludedMembers={setExcludedMembers}
              setSelectedRecIndex={setSelectedRecIndex}
              validatorReport={validatorReport}
              setValidatorReport={setValidatorReport}
              activeClub={activeClub}
              handleRunValidatorTest={handleRunValidatorTest}
            />

            <ConfigZone
              strategy={strategy}
              onChangeStrategy={onChangeStrategy}
              modelType={modelType}
              onChangeModelType={onChangeModelType}
              thresholdPct={thresholdPct}
              onChangeThresholdPct={onChangeThresholdPct}
              topK={topK}
              setTopK={setTopK}
              excludedTypes={excludedTypes}
              setSelectedRecIndex={setSelectedRecIndex}
              pipelineOutput={pipelineOutput}
              toggleTypeExclusion={toggleTypeExclusion}
            />

            <ResultsZone
              strategy={strategy}
              onChangeStrategy={onChangeStrategy}
              thresholdPct={thresholdPct}
              topK={topK}
              excludedMembers={excludedMembers}
              setExcludedMembers={setExcludedMembers}
              setSelectedRecIndex={setSelectedRecIndex}
              exportStatus={exportStatus}
              activeClub={activeClub}
              pipelineOutput={pipelineOutput}
              strategyComparison={strategyComparison}
              activeRec={activeRec}
              toggleMemberExclusion={toggleMemberExclusion}
              handleExportCsv={handleExportCsv}
            />
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
