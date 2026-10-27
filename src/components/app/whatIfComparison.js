const sameCandidate = (left, right) => left?.format_id === right?.format_id
  && left?.event_date === right?.event_date
  && left?.time_block === right?.time_block
  && left?.mode === right?.mode;

export function whatIfSettings(baseSettings, draft) {
  const { effective_strategy: _computed, ...base } = baseSettings;
  const excluded = new Set(base.excluded_format_ids || []);
  if (draft.excludeFormatId) excluded.add(draft.excludeFormatId);
  return {
    ...base,
    fee_cap_inr: draft.feeCap === '' ? null : Number(draft.feeCap),
    excluded_format_ids: [...excluded],
    only_date: draft.date || null,
    only_time_block: draft.timeBlock || null,
    excluded_member_id: draft.memberId || null,
    min_people_available: Number(draft.minPeople),
  };
}

export function compareWhatIf(basePlan, afterPlan, selected, draft) {
  const target = {
    ...selected,
    event_date: draft.date || selected.event_date,
    time_block: draft.timeBlock || selected.time_block,
  };
  const beforeRank = basePlan.recommendations.findIndex((item) => sameCandidate(item, selected)) + 1;
  const afterIndex = afterPlan.recommendations.findIndex((item) => sameCandidate(item, target));
  const afterSelected = afterIndex < 0 ? null : afterPlan.recommendations[afterIndex];
  const rejected = afterPlan.rejected_candidates.find((item) => sameCandidate(item, target));
  const replacement = afterSelected ? null : afterPlan.recommendations[0] || null;
  const afterMetrics = afterSelected || replacement;
  return {
    beforeRank,
    afterRank: afterIndex < 0 ? null : afterIndex + 1,
    rankChange: afterIndex < 0 ? null : afterIndex + 1 - beforeRank,
    afterStatus: rejected ? 'Rejected' : afterSelected ? 'Ranked' : 'Outside displayed results',
    afterMetrics,
    isReplacement: Boolean(replacement),
    turnoutChange: afterMetrics ? Number((afterMetrics.expected_attendance - selected.expected_attendance).toFixed(3)) : null,
    minimumChange: afterMetrics ? Number((afterMetrics.group_summary.minimum - selected.group_summary.minimum).toFixed(4)) : null,
    newlyRejectedReasons: rejected?.reason_codes || [],
  };
}
