import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { planCardView } from './planPresentation.js';

test('plan card numbers are derived from engine output for a 14-member club', () => {
  const perMember = Object.fromEntries(Array.from({ length: 14 }, (_, index) => {
    const id = `member-${index + 1}`;
    const value = Number((0.4 + index * 0.03).toFixed(4));
    return [id, { available: true, satisfaction: value, unavailable_reasons: [] }];
  }));
  perMember['member-1'].satisfaction = 0.22;
  const output = {
    expected_attendance: 10.7,
    expected_attendance_interval_95: [8.9, 12.5],
    available_member_ids: Object.keys(perMember),
    group_summary: { mean: 0.625, minimum: 0.22, standard_deviation: 0.1 },
    per_member_satisfaction: perMember,
  };

  const card = planCardView(output);
  assert.equal(card.turnout, '11 ± 2 of 14');
  assert.equal(card.why, 'About 11 of 14 available members may attend. Average interest is 63%, and the lowest is 22%.');
  assert.equal(card.members.length, 14);
  assert.equal(card.members.filter((member) => member.isLowest).length, 1);
  assert.equal(card.members.find((member) => member.memberId === 'member-1').percent, 22);
  assert.equal(card.availableCount, output.available_member_ids.length);
  assert.equal(card.expected, output.expected_attendance);
  assert.deepEqual(card.interval, output.expected_attendance_interval_95);
});

test('unavailable member is shown as unscored, not as a zero bar', () => {
  const output = {
    expected_attendance: 1, expected_attendance_interval_95: [0, 2],
    available_member_ids: ['a'], group_summary: { mean: 0.8, minimum: 0.8 },
    per_member_satisfaction: {
      a: { available: true, satisfaction: 0.8 },
      b: { available: false, satisfaction: null, unavailable_reasons: ['fee_above_member_max'] },
    },
  };
  const member = planCardView(output).members.find((item) => item.memberId === 'b');
  assert.equal(member.available, false);
  assert.equal(member.percent, null);
  assert.equal(member.isLowest, false);
});

test('the rendered card contains engine-derived turnout and all 14 member bars', async () => {
  const perMember = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [
    `member-${index + 1}`,
    { available: true, satisfaction: index === 0 ? 0.22 : 0.4 + index * 0.03, unavailable_reasons: [] },
  ]));
  const output = {
    format_id: 'hackathon', event_type_id: 'type-1', start: '2026-11-04T18:00:00',
    time_block: 'evening', mode: 'in_person', fee_inr: 0, confidence: 'low',
    expected_attendance: 10.7, expected_attendance_interval_95: [8.9, 12.5],
    available_member_ids: Object.keys(perMember),
    group_summary: { mean: 0.625, minimum: 0.22, standard_deviation: 0.1 },
    per_member_satisfaction: perMember,
  };
  const vite = await createServer({
    configFile: './vite.config.js',
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  try {
    const { PlanResultCard } = await vite.ssrLoadModule('/src/components/app/PlanResultCard.jsx');
    const markup = renderToStaticMarkup(React.createElement(PlanResultCard, {
      item: output,
      format: { name: 'Hackathon' },
      memberNames: Object.fromEntries(Object.keys(perMember).map((id, index) => [id, `Student ${index + 1}`])),
      venues: [], busy: false, onAccept: () => {},
    }));
    assert.match(markup, /Expected turnout:[\s\S]*11 ± 2 of 14/);
    assert.match(markup, /About 11 of 14 available members may attend/);
    assert.match(markup, /Average interest is 63%, and the lowest is 22%/);
    assert.match(markup, /Early estimate/);
    assert.match(markup, /Hackathon/);
    assert.match(markup, /evening/);
    assert.match(markup, /In person/);
    assert.match(markup, /Free/);
    assert.equal((markup.match(/role="img"/g) || []).length, 14);
    assert.match(markup, /Student 1[\s\S]*Lowest/);
  } finally {
    await vite.close();
  }
});

test('organizer results use the plan endpoint and retain loading and empty states', async () => {
  const source = await readFile(new URL('./OrganizerWorkflow.jsx', import.meta.url), 'utf8');
  assert.match(source, /\/api\/clubs\/\$\{clubId\}\/plan/);
  assert.doesNotMatch(source, /\/api\/clubs\/\$\{clubId\}\/recommendations/);
  assert.match(source, /planningBusy &&/);
  assert.match(source, /Ready to find a time/);
  assert.match(source, /No matching event ideas/);
});

test('diagnostics render grouped rejection details and a filtered availability heatmap', async () => {
  const vite = await createServer({
    configFile: './vite.config.js',
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  try {
    const { PlanDiagnostics } = await vite.ssrLoadModule('/src/components/app/PlanDiagnostics.jsx');
    const blocks = ['morning', 'midday', 'afternoon', 'evening', 'late_evening'];
    const planResult = {
      candidate_count: 20, feasible_count: 5, rejected_candidate_count: 15,
      rejection_groups: [{
        reason_code: 'min_people_available', label: 'Not enough members free', count: 3,
        examples: [{
          format_id: 'hackathon', event_date: '2026-11-04', time_block: 'evening',
          mode: 'in_person', fee_inr: 0, available_member_count: 5, member_count: 14,
          blocked_members: [{ member_id: 'm1', reason_codes: ['not_available'] }],
        }],
      }],
      availability_heatmap: {
        window_minutes: 60,
        cells: blocks.map((time_block, index) => ({
          date: '2026-11-04', weekday: 'Wed', time_block, free_count: 7, member_count: 14,
          availability_percent: 50, filtered_out: index === 0,
          filter_reason_codes: index === 0 ? ['exam_week'] : [],
        })),
      },
    };
    const markup = renderToStaticMarkup(React.createElement(PlanDiagnostics, {
      planResult,
      members: [{ id: 'm1', name: 'Aarav' }],
      formats: [{ id: 'hackathon', name: 'Campus Hackathon' }],
    }));
    assert.match(markup, /Checked 20 possibilities: 5 passed the filters and 15 were rejected/);
    assert.match(markup, /Not enough members free/);
    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /Filtered/);
    assert.equal((markup.match(/class="quorum-app__heat-cell/g) || []).length, 5);
    const componentSource = await readFile(new URL('./PlanDiagnostics.jsx', import.meta.url), 'utf8');
    assert.match(componentSource, /group\.examples\.map/);
    assert.match(componentSource, /blocked_members/);
  } finally {
    await vite.close();
  }
});
