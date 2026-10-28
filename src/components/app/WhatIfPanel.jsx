import React, { useState } from 'react';
import { apiWrite } from '../../utils/apiClient.js';
import { compareWhatIf, whatIfSettings } from './whatIfComparison.js';
import { PlanRecoverySummary, RelaxationEvidence } from './PlanRecoverySummary.jsx';

const BLOCKS = ['morning', 'midday', 'afternoon', 'evening', 'late_evening'];
const signed = (value, suffix = '') => `${value > 0 ? '+' : ''}${value}${suffix}`;

export function WhatIfPanel({ clubId, basePlan, item, formats, members, onApply }) {
  const base = basePlan.settings;
  const [draft, setDraft] = useState({
    feeCap: base.fee_cap_inr == null ? '' : String(base.fee_cap_inr),
    excludeFormatId: '', date: base.only_date || '', timeBlock: base.only_time_block || '',
    memberId: base.excluded_member_id || '', minPeople: String(base.min_people_available),
  });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setField = (name, value) => { setDraft((current) => ({ ...current, [name]: value })); setPreview(null); setError(''); };
  const start = new Date(`${base.start_date}T12:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + Number(base.horizon_days) - 1);
  const lastDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

  const previewSettings = async (settings) => {
    setBusy(true); setError(''); setPreview(null);
    try {
      const after = await apiWrite(`/api/clubs/${clubId}/plan`, { body: settings });
      setPreview({ after, comparison: compareWhatIf(basePlan, after, item, draft) });
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };
  const runPreview = (event) => { event.preventDefault(); return previewSettings(whatIfSettings(base, draft)); };
  const applyFixChip = (chip) => previewSettings({ ...preview.after.requested_settings, ...chip.settings_updates });

  return <section className="quorum-app__what-if" aria-label="What-if preview">
    <h4>What if we change this plan?</h4>
    <p>Preview a fresh engine run. The current plan stays in place until you apply it.</p>
    <form onSubmit={runPreview} className="quorum-app__what-if-fields">
      <label>Maximum fee per person (₹)<input type="number" min="0" max="100000" placeholder="No limit" value={draft.feeCap} onChange={(event) => setField('feeCap', event.target.value)} /></label>
      <label>Exclude an event format<select value={draft.excludeFormatId} onChange={(event) => setField('excludeFormatId', event.target.value)}><option value="">None</option>{formats.filter((format) => !(base.excluded_format_ids || []).includes(format.id)).map((format) => <option key={format.id} value={format.id}>{format.name}</option>)}</select></label>
      <label>Use only this day<input type="date" min={base.start_date} max={lastDate} value={draft.date} onChange={(event) => setField('date', event.target.value)} /></label>
      <label>Use only this time block<select value={draft.timeBlock} onChange={(event) => setField('timeBlock', event.target.value)}><option value="">Any time</option>{BLOCKS.map((block) => <option key={block} value={block}>{block.replaceAll('_', ' ')}</option>)}</select></label>
      <label>Exclude a member<select value={draft.memberId} onChange={(event) => setField('memberId', event.target.value)}><option value="">Nobody</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label>Minimum people needed<input type="number" min="1" max={members.length - Number(Boolean(draft.memberId))} value={draft.minPeople} onChange={(event) => setField('minPeople', event.target.value)} required /></label>
      <button className="quorum-app__button" type="submit" disabled={busy}>{busy ? 'Re-running planner…' : 'Preview changes'}</button>
    </form>
    {error && <p role="alert" className="quorum-app__error">{error}</p>}
    {preview && <div className="quorum-app__what-if-result" role="status">
      <PlanRecoverySummary plan={preview.after} onApplyFix={applyFixChip} busy={busy} />
      <RelaxationEvidence item={preview.comparison.afterMetrics} memberNames={Object.fromEntries(members.map((member) => [member.id, member.name]))} />
      <h5>Before / after</h5>
      {preview.comparison.isReplacement && <p>After figures show the highest-ranked replacement idea because the selected idea is not in the new results.</p>}
      <div className="quorum-app__what-if-columns"><span>Measure</span><span>Before</span><span>After</span></div>
      <dl>
        <div><dt>Selected idea's rank</dt><dd>#{preview.comparison.beforeRank}</dd><dd>{preview.comparison.afterRank ? `#${preview.comparison.afterRank} (${preview.comparison.rankChange === 0 ? 'same rank' : `${preview.comparison.rankChange > 0 ? 'down' : 'up'} ${Math.abs(preview.comparison.rankChange)}`})` : preview.comparison.afterStatus}</dd></div>
        <div><dt>Expected turnout</dt><dd>{item.expected_attendance.toFixed(1)}</dd><dd>{preview.comparison.afterMetrics ? `${preview.comparison.afterMetrics.expected_attendance.toFixed(1)} (${signed(preview.comparison.turnoutChange.toFixed(1))})` : 'No feasible idea'}</dd></div>
        <div><dt>Least-happy member</dt><dd>{Math.round(item.group_summary.minimum * 100)}%</dd><dd>{preview.comparison.afterMetrics ? `${Math.round(preview.comparison.afterMetrics.group_summary.minimum * 100)}% (${signed(Math.round(preview.comparison.minimumChange * 100), '%')})` : 'No feasible idea'}</dd></div>
      </dl>
      <p><strong>New rejection reasons:</strong> {preview.comparison.newlyRejectedReasons.length ? preview.comparison.newlyRejectedReasons.map((reason) => reason.replaceAll('_', ' ')).join(', ') : 'None for this idea'}</p>
      <button type="button" className="quorum-app__button" disabled={!preview.after.recommendations.length} onClick={() => onApply(preview.after)}>Apply this plan</button>
    </div>}
  </section>;
}
