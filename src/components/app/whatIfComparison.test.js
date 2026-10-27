import test from 'node:test';
import assert from 'node:assert/strict';
import { compareWhatIf, whatIfSettings } from './whatIfComparison.js';

const baseSettings = Object.freeze({
  start_date: '2027-02-01', horizon_days: 7, top_k: 2, strategy: 'average',
  min_people_available: 5, fee_cap_inr: null, selected_format_ids: [],
  excluded_format_ids: [], only_date: null, only_time_block: null,
  excluded_member_id: null, effective_strategy: 'average',
});
const draft = { feeCap: '100', excludeFormatId: 'f2', date: '2027-02-03',
  timeBlock: 'evening', memberId: 'm4', minPeople: '7' };

test('all six what-if edits become a separate engine request without changing the base', () => {
  const request = whatIfSettings(baseSettings, draft);
  assert.equal(request.fee_cap_inr, 100);
  assert.deepEqual(request.excluded_format_ids, ['f2']);
  assert.equal(request.only_date, '2027-02-03');
  assert.equal(request.only_time_block, 'evening');
  assert.equal(request.excluded_member_id, 'm4');
  assert.equal(request.min_people_available, 7);
  assert.equal(request.effective_strategy, undefined);
  assert.equal(baseSettings.fee_cap_inr, null);
  assert.equal(baseSettings.only_date, null);
});

test('displayed deltas use the rerun response, including rejection and replacement', () => {
  const selected = { format_id: 'f1', event_date: '2027-02-01', time_block: 'morning', mode: 'in_person',
    expected_attendance: 11, group_summary: { minimum: 0.25 } };
  const alternative = { format_id: 'f2', event_date: '2027-02-01', time_block: 'morning', mode: 'in_person',
    expected_attendance: 9, group_summary: { minimum: 0.4 } };
  const before = { recommendations: [selected, alternative] };
  const after = { recommendations: [alternative], rejected_candidates: [{ ...selected, reason_codes: ['format_excluded'] }] };
  const comparison = compareWhatIf(before, after, selected, { date: '', timeBlock: '' });
  assert.equal(comparison.beforeRank, 1);
  assert.equal(comparison.afterRank, null);
  assert.equal(comparison.afterStatus, 'Rejected');
  assert.equal(comparison.turnoutChange, -2);
  assert.equal(comparison.minimumChange, 0.15);
  assert.deepEqual(comparison.newlyRejectedReasons, ['format_excluded']);
  assert.equal(comparison.isReplacement, true);
});

test('changed day and block match the rerun candidate rather than the original slot', () => {
  const selected = { format_id: 'f1', event_date: '2027-02-01', time_block: 'morning', mode: 'in_person',
    expected_attendance: 8, group_summary: { minimum: 0.2 } };
  const moved = { ...selected, event_date: '2027-02-03', time_block: 'evening',
    expected_attendance: 10, group_summary: { minimum: 0.3 } };
  const result = compareWhatIf({ recommendations: [selected] },
    { recommendations: [moved], rejected_candidates: [] }, selected,
    { date: '2027-02-03', timeBlock: 'evening' });
  assert.equal(result.afterRank, 1);
  assert.equal(result.turnoutChange, 2);
  assert.equal(result.minimumChange, 0.1);
});

test('rank movement comes from the rerun order', () => {
  const selected = { format_id: 'f1', event_date: '2027-02-01', time_block: 'morning',
    mode: 'in_person', expected_attendance: 8, group_summary: { minimum: 0.2 } };
  const other = { ...selected, format_id: 'f2', expected_attendance: 9 };
  const result = compareWhatIf({ recommendations: [selected, other] },
    { recommendations: [other, selected], rejected_candidates: [] }, selected,
    { date: '', timeBlock: '' });
  assert.equal(result.beforeRank, 1);
  assert.equal(result.afterRank, 2);
  assert.equal(result.rankChange, 1);
});
