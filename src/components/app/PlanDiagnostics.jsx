import React, { useMemo, useState } from 'react';

const BLOCK_LABELS = {
  morning: 'Morning',
  midday: 'Midday',
  afternoon: 'Afternoon',
  evening: 'Evening',
  late_evening: 'Late evening',
};

const MEMBER_REASON_LABELS = {
  fee_above_member_max: 'over their fee limit',
  mode_mismatch: 'prefer another event mode',
  latest_start_time: 'the start time is too late for them',
  not_available: 'are not free for this time',
};

function CandidateExample({ example, memberNames, formatNames }) {
  const blocked = example.blocked_members || [];
  const weekday = new Date(`${example.event_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
  return <article className="quorum-app__rejection-example">
    <div className="quorum-app__rejection-example-head">
      <strong>{formatNames[example.format_id] || example.format_id}</strong>
      <span>{weekday}, {example.event_date} · {BLOCK_LABELS[example.time_block] || example.time_block}</span>
    </div>
    <p>{example.available_member_count} of {example.member_count ?? 'the club'} members could attend · {example.mode === 'online' ? 'Online' : 'In person'} · {example.fee_inr === 0 ? 'Free' : `₹${example.fee_inr}`}</p>
    {blocked.length ? <ul className="quorum-app__blocked-members">
      {blocked.map(({ member_id, reason_codes }) => <li key={member_id}>
        <strong>{memberNames[member_id] || member_id}</strong> — {reason_codes.map((code) => MEMBER_REASON_LABELS[code] || code.replaceAll('_', ' ')).join(', ')}
      </li>)}
    </ul> : <p className="quorum-app__diagnostic-note">This filter applies to the candidate, rather than to particular members.</p>}
  </article>;
}

function AvailabilityHeatmap({ heatmap }) {
  const rows = useMemo(() => {
    const grouped = new Map();
    for (const cell of heatmap?.cells || []) {
      if (!grouped.has(cell.date)) grouped.set(cell.date, { weekday: cell.weekday, cells: {} });
      grouped.get(cell.date).cells[cell.time_block] = cell;
    }
    return [...grouped.entries()].map(([date, row]) => ({ date, ...row }));
  }, [heatmap]);

  return <div className="quorum-app__heatmap-wrap">
    <table className="quorum-app__heatmap">
      <thead><tr><th scope="col">Day</th>{Object.entries(BLOCK_LABELS).map(([block, label]) => <th scope="col" key={block}>{label}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.date}>
        <th scope="row"><span>{row.weekday}</span><small>{row.date}</small></th>
        {Object.keys(BLOCK_LABELS).map((block) => {
          const cell = row.cells[block];
          const filterLabel = cell.filter_reason_codes?.length ? ` Filtered by: ${cell.filter_reason_codes.join(', ').replaceAll('_', ' ')}.` : '';
          return <td key={block}>
            <span className={`quorum-app__heat-cell${cell.filtered_out ? ' is-filtered' : ''}`}
              style={{ '--free-pct': `${cell.availability_percent}%` }}
              title={`${cell.free_count} of ${cell.member_count} members free for a one-hour window.${filterLabel}`}
              aria-label={`${row.weekday} ${row.date}, ${BLOCK_LABELS[block]}: ${cell.availability_percent}% free${cell.filtered_out ? ', no candidate passed the filters' : ''}`}>
              <strong>{Math.round(cell.availability_percent)}%</strong>
              {cell.filtered_out && <small>Filtered</small>}
            </span>
          </td>;
        })}
      </tr>)}</tbody>
    </table>
  </div>;
}

export function PlanDiagnostics({ planResult, members, formats }) {
  const [expandedReason, setExpandedReason] = useState('');
  const memberNames = useMemo(() => Object.fromEntries(members.map((member) => [member.id, member.name])), [members]);
  const formatNames = useMemo(() => Object.fromEntries(formats.map((format) => [format.id, format.name])), [formats]);
  const groups = planResult.rejection_groups || [];
  return <section className="quorum-app__diagnostics" aria-labelledby="plan-diagnostics-heading">
    <h2 id="plan-diagnostics-heading">Availability and filtered-out ideas</h2>
    <p className="quorum-app__diagnostic-note">Checked {planResult.candidate_count} possibilities: {planResult.feasible_count} passed the filters and {planResult.rejected_candidate_count} were rejected. A candidate can have more than one rejection reason. The heatmap shows who is free for a one-hour window; event suggestions must fit the full event duration.</p>
    <h3>When members are free</h3>
    <AvailabilityHeatmap heatmap={planResult.availability_heatmap} />
    <div className="quorum-app__reason-groups">
      <h3>Why other ideas were filtered out</h3>
      {!groups.length && <p>No candidates were filtered out.</p>}
      {groups.map((group) => <section className="quorum-app__reason-group" key={group.reason_code}>
        <button type="button" aria-expanded={expandedReason === group.reason_code}
          onClick={() => setExpandedReason((current) => current === group.reason_code ? '' : group.reason_code)}>
          <span>{group.label}</span><strong>{group.count}</strong>
        </button>
        {expandedReason === group.reason_code && <div className="quorum-app__reason-examples">
          {group.examples.map((example) => <CandidateExample key={`${example.format_id}-${example.event_date}-${example.time_block}-${example.mode}`} example={example} memberNames={memberNames} formatNames={formatNames} />)}
        </div>}
      </section>)}
    </div>
  </section>;
}
