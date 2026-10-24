#!/usr/bin/env node
/**
 * Quorum — landing-page verification harness
 *
 * Checks the in-browser demo engine and confirms the evaluation numbers shown
 * on the landing page match the committed backend results, with no browser and
 * no dependencies beyond Node itself.
 *
 *   node tools/verify.mjs
 *
 * Exits non-zero if any documented invariant is broken, so it doubles as a
 * smoke test in CI.
 */

import { readFileSync } from 'node:fs';
import {
  runQuorumPipeline,
  validateCsvDataset,
} from '../src/utils/recommenderEngine.js';
import { SAMPLE_CLUBS, CSV_VALIDATION_TEST_SAMPLE } from '../src/data/clubsDataset.js';
import { AGGREGATION_STRATEGIES, PREFERENCE_MODELS } from '../src/config/siteConfig.js';

const RESULTS_DIRECTORY = new URL('../results/evaluation/', import.meta.url);
const LANDING_RESULTS = new URL('../src/data/evaluationResults.json', import.meta.url);
const EXPECTED_CSV = { total: 30, valid: 27, errors: 3 };

const failures = [];
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return ok;
};

const heading = (text) => {
  process.stdout.write(`\n${text}\n${'-'.repeat(text.length)}\n`);
};

const table = (headers, rows) => {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  process.stdout.write(`${line(headers)}\n`);
  process.stdout.write(`${widths.map((w) => '-'.repeat(w)).join('  ')}\n`);
  rows.forEach((r) => process.stdout.write(`${line(r)}\n`));
};

const parseCsv = (text) => {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [columns[index], value])));
};

// The landing page renders src/data/evaluationResults.json; it must never drift
// from the CSVs produced by backend/evaluation (regenerate with
// `python tools/export_landing_results.py`).
const runEvaluationSnapshot = () => {
  heading('Landing-page evaluation snapshot vs results/evaluation');
  const landing = JSON.parse(readFileSync(LANDING_RESULTS, 'utf8'));
  const summary = parseCsv(readFileSync(new URL('summary_95ci.csv', RESULTS_DIRECTORY), 'utf8'));
  const meanOf = (method, metric) => Number(summary.find((row) => row.method === method && row.metric === metric)?.mean);
  let mismatches = 0;
  for (const row of landing.rows) {
    for (const metric of landing.metrics) {
      if (row.metrics[metric].mean !== Number(meanOf(row.id, metric).toFixed(3))) mismatches += 1;
    }
  }
  const mainRow = landing.rows.find((row) => row.family === 'Main');
  table(
    ['Method', ...landing.metrics],
    [mainRow, ...landing.rows.filter((row) => row !== mainRow)].map((row) => [row.label.slice(0, 28), ...landing.metrics.map((metric) => row.metrics[metric].mean)])
  );
  check('landing snapshot matches summary_95ci.csv', mismatches, 0);
};

const runValidator = () => {
  heading('Schema validator (FR-002, FR-003, FR-004)');
  const report = validateCsvDataset(CSV_VALIDATION_TEST_SAMPLE, 10);
  table(
    ['Row', 'Issues'],
    report.errors.map((e) => [e.row, e.issues.join(' | ')])
  );
  process.stdout.write(
    `\n${report.validCount}/${report.totalRows} rows valid, ${report.errorCount} rejected\n`
  );
  check('CSV validator row counts', [report.totalRows, report.validCount, report.errorCount], [
    EXPECTED_CSV.total,
    EXPECTED_CSV.valid,
    EXPECTED_CSV.errors,
  ]);
  return report;
};

const runPipeline = () => {
  heading('Recommendation pipeline (FR-005 to FR-015)');
  const rows = [];
  for (const club of SAMPLE_CLUBS) {
    const out = runQuorumPipeline(club, {
      strategy: 'fairness_aware',
      modelType: 'hybrid_mf',
      thresholdPct: 50,
      topK: 3,
    });
    const top = out.recommendations[0];
    rows.push([
      club.club_id,
      club.members.length,
      club.is_synthetic ? 'yes' : 'no',
      out.lowConfidenceClub ? 'warn' : '-',
      out.hasColdStartMember ? 'warn' : '-',
      out.fallbackTriggered ? 'fallback' : '-',
      out.totalCandidatesEvaluated,
      `${top.eventType.label} @ ${top.day} ${top.slotLabel}`,
      top.groupScore,
      top.minScore,
      top.expectedAttendance,
    ]);

    // FR-013: every member must appear in the breakdown, scored or explicitly
    // marked unavailable. A missing member is a bug, not a formatting nit.
    const breakdown = top.memberBreakdown;
    check(`${club.club_id} breakdown covers all members`, breakdown.length, club.members.length);
    check(
      `${club.club_id} unavailable members carry no score`,
      breakdown.filter((m) => !m.available && m.score !== null).length,
      0
    );
    // FR-014: the explanation must quote the numbers it is derived from.
    check(
      `${club.club_id} explanation quotes the availability count`,
      top.explanation.includes(`${top.availableCount} of ${top.totalMembers}`),
      true
    );
  }
  table(
    ['Club', 'Mem', 'Synth', 'LowConf', 'Cold', 'Fallback', 'Cands', 'Top pick', 'Score', 'MinSat', 'ExpAtt'],
    rows
  );
};

const runStrategyComparison = () => {
  heading('Aggregation strategy comparison (FR-009 to FR-011)');
  for (const club of SAMPLE_CLUBS) {
    const picks = AGGREGATION_STRATEGIES.map((s) => {
      const out = runQuorumPipeline(club, {
        strategy: s.id,
        modelType: 'hybrid_mf',
        thresholdPct: 50,
        topK: 3,
      });
      const top = out.recommendations[0];
      return {
        strategy: s.shortName,
        pick: `${top.eventType.label} @ ${top.day} ${top.slotLabel}`,
        score: top.groupScore,
        minSat: top.minScore,
        order: out.recommendations.map((r) => `${r.eventType.id}@${r.slotKey}`).join(' > '),
      };
    });
    process.stdout.write(`\n${club.club_id} — ${club.regime}\n`);
    table(
      ['Strategy', 'Top pick', 'Score', 'MinSat'],
      picks.map((p) => [p.strategy, p.pick, p.score, p.minSat])
    );
    const distinctOrders = new Set(picks.map((p) => p.order)).size;
    process.stdout.write(`  shortlist orderings: ${distinctOrders} distinct across strategies\n`);
  }
};

const runModelComparison = () => {
  heading('Preference model comparison (FR-007, FR-008)');
  const club = SAMPLE_CLUBS[0];
  const rows = PREFERENCE_MODELS.map((m) => {
    const out = runQuorumPipeline(club, {
      strategy: 'fairness_aware',
      modelType: m.id,
      thresholdPct: 50,
      topK: 1,
    });
    const top = out.recommendations[0];
    return [
      m.label,
      m.isBaseline ? 'baseline' : 'candidate',
      `${top.eventType.label} @ ${top.day} ${top.slotLabel}`,
      top.groupScore,
      top.minScore,
    ];
  });
  table(['Model', 'Family', 'Top pick', 'Score', 'MinSat'], rows);
};

const main = () => {
  process.stdout.write('Quorum verification harness\n');
  process.stdout.write(`node ${process.version}\n`);

  runEvaluationSnapshot();
  runValidator();
  runPipeline();
  runStrategyComparison();
  runModelComparison();

  heading('Result');
  if (failures.length === 0) {
    process.stdout.write('All documented invariants hold.\n');
    process.exit(0);
  }
  process.stdout.write(`${failures.length} invariant(s) failed:\n`);
  failures.forEach((f) => process.stdout.write(`  - ${f}\n`));
  process.exit(1);
};

main();
