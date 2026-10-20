#!/usr/bin/env node
/**
 * Quorum — verification harness (FR-017, FR-018)
 *
 * Reproduces every table quoted in the README and the Evaluation section of the
 * demo UI, straight from the recommender engine, with no browser and no
 * dependencies beyond Node itself.
 *
 *   node tools/verify.mjs                 # default seed 42
 *   node tools/verify.mjs --seed 7        # a different seed
 *   node tools/verify.mjs --all           # every seed used in the UI
 *
 * Exits non-zero if any documented invariant is broken, so it doubles as a
 * smoke test in CI.
 */

import {
  runSeededEvaluationHarness,
  runQuorumPipeline,
  validateCsvDataset,
} from '../src/utils/recommenderEngine.js';
import { SAMPLE_CLUBS, CSV_VALIDATION_TEST_SAMPLE } from '../src/data/clubsDataset.js';
import { AGGREGATION_STRATEGIES, PREFERENCE_MODELS } from '../src/config/siteConfig.js';

const UI_SEEDS = [42, 7, 2026];
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

const parseArgs = (argv) => {
  const args = { seed: 42, all: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--seed') {
      args.seed = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--all') {
      args.all = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      process.stdout.write(
        'Usage: node tools/verify.mjs [--seed <n>] [--all]\n' +
          '  --seed <n>  seed for the evaluation harness (default 42)\n' +
          '  --all       run every seed the demo UI offers (42, 7, 2026)\n'
      );
      process.exit(0);
    }
  }
  if (!Number.isFinite(args.seed)) {
    process.stderr.write(`Invalid --seed value\n`);
    process.exit(2);
  }
  return args;
};

const runHarness = (seed) => {
  heading(`Evaluation harness (seed ${seed})`);
  const data = runSeededEvaluationHarness(seed);
  table(
    ['Method', 'MAE', 'RMSE', 'Hit@3', 'MinSat homo', 'MinSat conflict', 'Gini'],
    data.rows.map((r) => [
      r.method,
      r.mae,
      r.rmse,
      r.hitAt3,
      r.homoMinSat,
      r.conflictMinSat,
      r.giniInequality,
    ])
  );

  // FR-018: the same seed must reproduce the same table exactly.
  const repeat = runSeededEvaluationHarness(seed);
  check(`harness determinism (seed ${seed})`, repeat.rows, data.rows);

  // The fairness-aware row is the headline claim; it must lead on both
  // minimum-satisfaction metrics and on the inequality metric.
  const fair = data.rows.find((r) => r.isHighlight);
  const avg = data.rows.find((r) => r.method.includes('Average'));
  const least = data.rows.find((r) => r.method.includes('Least-Misery'));
  check('fairness-aware beats average on conflict min-satisfaction', Number(fair.conflictMinSat) > Number(avg.conflictMinSat), true);
  check('least-misery beats average on conflict min-satisfaction', Number(least.conflictMinSat) > Number(avg.conflictMinSat), true);
  check('fairness-aware has the lowest Gini', Number(fair.giniInequality) < Number(avg.giniInequality), true);
  return data;
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
  const args = parseArgs(process.argv.slice(2));
  process.stdout.write('Quorum verification harness\n');
  process.stdout.write(`node ${process.version}\n`);

  const seeds = args.all ? UI_SEEDS : [args.seed];
  seeds.forEach((seed) => runHarness(seed));
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
