import React from 'react';

export function RelaxationEvidence({ item, memberNames = {} }) {
  if (!item?.relaxations_applied?.length) return null;
  return <div className="quorum-app__relaxation-evidence">
    <strong>Closest match — changes made:</strong>
    <div>{item.relaxations_applied.map((step) => <span className="quorum-app__relaxation-badge" key={step.code}>{step.code.replaceAll('_', ' ')}: {Array.isArray(step.from) ? step.from.length : String(step.from)} → {Array.isArray(step.to) ? step.to.length : String(step.to)}</span>)}</div>
    <details><summary>{item.affected_members?.length || 0} members affected</summary>
      <ul>{(item.affected_members || []).map((member) => <li key={member.member_id}>{memberNames[member.member_id] || member.member_id}{member.reasons.length ? ` — ${member.reasons.join(', ').replaceAll('_', ' ')}` : ''}</li>)}</ul>
    </details>
  </div>;
}

export function PlanRecoverySummary({ plan, onApplyFix, busy = false }) {
  if (!plan || plan.tier === 'exact') return null;
  return <section className="quorum-app__recovery" aria-label="Planning diagnosis">
    <h3>{plan.strict_count} exact matches</h3>
    <p>{plan.tier === 'closest' ? 'Closest matches are shown below. Every changed requirement is marked with the result.' : 'No feasible idea was found, even after the allowed relaxation steps.'}</p>
    <h4>What blocked the exact plan</h4>
    <ul className="quorum-app__diagnosis-list">{(plan.diagnosis || []).map((item) => <li key={item.code}>
      <strong>{item.count}{item.required != null ? ` / ${item.required}` : ''}</strong> {item.label}
    </li>)}</ul>
    {(plan.fix_chips || []).length > 0 && <><h4>Try one change at a time</h4>
      <div className="quorum-app__fix-chips">{plan.fix_chips.map((chip) => <button key={chip.code} type="button" disabled={busy} onClick={() => onApplyFix(chip)}>
        {chip.label} <strong>{chip.idea_count} {chip.idea_count === 1 ? 'idea' : 'ideas'}</strong>
      </button>)}</div>
      <p className="quorum-app__diagnostic-note">Counts show ideas that pass all strict filters when only that setting changes.</p>
    </>}
  </section>;
}
