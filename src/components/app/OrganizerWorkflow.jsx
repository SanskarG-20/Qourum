import React, { useEffect, useMemo, useState } from 'react';
import './member-onboarding.css';
import { api, apiWrite } from '../../utils/apiClient.js';
import { EventRequirements } from './EventRequirements.jsx';
import { PlanResultCard } from './PlanResultCard.jsx';
import { PlanDiagnostics } from './PlanDiagnostics.jsx';
import { ParetoPlanChart } from './ParetoPlanChart.jsx';
import { WhatIfPanel } from './WhatIfPanel.jsx';

export function OrganizerWorkflow({ clubId, clubName, onLogout }) {
  const [strategy, setStrategy] = useState('average');
  const [fairness, setFairness] = useState(false);
  const [topN, setTopN] = useState(10);
  const [quorum, setQuorum] = useState('');
  const [horizon, setHorizon] = useState(21);
  const [diversity, setDiversity] = useState(true);
  const [formats, setFormats] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeRecipe, setActiveRecipe] = useState('');
  const [selectedFormatIds, setSelectedFormatIds] = useState([]);
  const [feePolicy, setFeePolicy] = useState('any');
  const [maxFee, setMaxFee] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('any');
  const [skillLevelFilter, setSkillLevelFilter] = useState('any');
  const [excludeLabHeavyDays, setExcludeLabHeavyDays] = useState(false);
  const [preferShortFormats, setPreferShortFormats] = useState(false);
  const [exploration, setExploration] = useState(false);
  const [planResult, setPlanResult] = useState(null);
  const [planSweepResult, setPlanSweepResult] = useState(null);
  const [selectedSweepPointId, setSelectedSweepPointId] = useState('');
  const [selectedWhatIfKey, setSelectedWhatIfKey] = useState('');
  const [appliedWhatIfFilters, setAppliedWhatIfFilters] = useState({});
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedFeedbackEvent, setSelectedFeedbackEvent] = useState('');
  const [attendance, setAttendance] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [planningBusy, setPlanningBusy] = useState(false);
  const [sweepBusy, setSweepBusy] = useState(false);

  const memberNames = useMemo(() => Object.fromEntries(members.map((member) => [member.id, member.name])), [members]);
  const pastVenues = useMemo(() => Object.fromEntries(['in_person', 'online'].map((mode) => [
    mode,
    [...new Set(events.filter((event) => event.delivery_mode === mode && event.venue).map((event) => event.venue))].sort(),
  ])), [events]);
  const pastEvents = events.filter((event) => new Date(event.start_time) < new Date() && event.status !== 'cancelled');
  const defaultQuorum = Math.max(5, Math.ceil(.3 * members.length)) || 5;
  const strategyOptions = [
    ['average', 'Balance member interest', 'Give available members equal weight.'],
    ['least_misery', 'Raise the lowest interest', 'Choose ideas with a stronger score for the least interested member.'],
  ];

  const loadEvents = async () => setEvents(await api(`/api/clubs/${clubId}/events`));
  useEffect(() => {
    Promise.all([
      api(`/api/clubs/${clubId}/events`),
      api(`/api/clubs/${clubId}/members`),
      api(`/api/clubs/${clubId}/event-formats`),
      api(`/api/clubs/${clubId}/plan-presets`),
    ]).then(([loadedEvents, loadedMembers, catalog, presetCatalog]) => {
      setEvents(loadedEvents);
      setMembers(loadedMembers);
      setFormats(catalog.formats);
      setRecipes(presetCatalog.recipes);
    }).catch((reason) => setError(reason.message));
  }, [clubId]);

  const currentPlanSettings = (overrides = null) => ({
      strategy, fairness, diversity, top_k: Number(topN),
      min_people_available: quorum ? Number(quorum) : defaultQuorum,
      horizon_days: Number(horizon), selected_format_ids: selectedFormatIds,
      fee_policy: feePolicy, fee_cap_inr: maxFee === '' ? null : Number(maxFee),
      delivery_mode: deliveryMode, skill_level_filter: skillLevelFilter,
      exclude_lab_heavy_days: excludeLabHeavyDays, prefer_short_formats: preferShortFormats,
      exploration, ...appliedWhatIfFilters, ...(overrides || {}),
  });

  const runPlan = async (event, overrides = null) => {
    event?.preventDefault();
    const settings = currentPlanSettings(overrides);
    setBusy(true); setPlanningBusy(true); setPlanResult(null); setSelectedWhatIfKey(''); setError(''); setNotice('');
    try {
      const result = await apiWrite(`/api/clubs/${clubId}/plan`, {
        body: settings,
      });
      setPlanResult(result);
      if (!result.recommendations.length) setNotice('No event ideas fit these choices. Try a lower minimum, a higher fee limit, or a longer search window.');
      else setNotice(`Found ${result.recommendations.length} event ideas that fit your choices.`);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); setPlanningBusy(false); }
  };

  const runPlanSweep = async () => {
    setSweepBusy(true); setPlanSweepResult(null); setSelectedSweepPointId(''); setError('');
    try {
      const result = await apiWrite(`/api/clubs/${clubId}/plan-sweep`, {
        body: { ...currentPlanSettings(), max_plans: 12 },
      });
      setPlanSweepResult(result);
      window.setTimeout(() => document.getElementById('plan-sweep-chart')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch (reason) { setError(reason.message); }
    finally { setSweepBusy(false); }
  };

  const loadSweepPoint = async (point) => {
    const settings = point.settings;
    setSelectedSweepPointId(point.id);
    setActiveRecipe('');
    setStrategy(settings.strategy);
    setFairness(settings.fairness);
    setDiversity(settings.diversity);
    setTopN(String(settings.top_k));
    setQuorum(String(settings.min_people_available));
    setHorizon(String(settings.horizon_days));
    setSelectedFormatIds(settings.selected_format_ids);
    setFeePolicy(settings.fee_policy);
    setMaxFee(settings.fee_cap_inr == null ? '' : String(settings.fee_cap_inr));
    setDeliveryMode(settings.delivery_mode);
    setSkillLevelFilter(settings.skill_level_filter);
    setExcludeLabHeavyDays(settings.exclude_lab_heavy_days);
    setPreferShortFormats(settings.prefer_short_formats);
    setExploration(settings.exploration);
    setAppliedWhatIfFilters({
      excluded_format_ids: settings.excluded_format_ids || [], excluded_member_id: settings.excluded_member_id || null,
      only_date: settings.only_date || null, only_time_block: settings.only_time_block || null,
    });
    await runPlan(null, settings);
    window.setTimeout(() => document.getElementById('ranked-plan-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const applyRecipe = async (recipe) => {
    const settings = recipe.settings;
    setActiveRecipe(recipe.id);
    setStrategy(settings.strategy);
    setFairness(settings.fairness);
    setDiversity(settings.diversity);
    setSelectedFormatIds(settings.selected_format_ids);
    setFeePolicy(settings.fee_policy);
    setMaxFee(settings.fee_cap_inr == null ? '' : String(settings.fee_cap_inr));
    setDeliveryMode(settings.delivery_mode);
    setSkillLevelFilter(settings.skill_level_filter);
    setExcludeLabHeavyDays(settings.exclude_lab_heavy_days);
    setPreferShortFormats(settings.prefer_short_formats);
    setExploration(settings.exploration);
    setAppliedWhatIfFilters({});
    await runPlan(null, { excluded_format_ids: [], excluded_member_id: null, only_date: null, only_time_block: null, ...settings });
  };

  const applyWhatIf = (after) => {
    const settings = after.settings;
    setStrategy(settings.strategy); setFairness(settings.fairness); setDiversity(settings.diversity);
    setTopN(String(settings.top_k)); setQuorum(String(settings.min_people_available));
    setHorizon(String(settings.horizon_days)); setSelectedFormatIds(settings.selected_format_ids);
    setFeePolicy(settings.fee_policy); setMaxFee(settings.fee_cap_inr == null ? '' : String(settings.fee_cap_inr));
    setDeliveryMode(settings.delivery_mode); setSkillLevelFilter(settings.skill_level_filter);
    setExcludeLabHeavyDays(settings.exclude_lab_heavy_days); setPreferShortFormats(settings.prefer_short_formats);
    setExploration(settings.exploration); setActiveRecipe('');
    setAppliedWhatIfFilters({
      excluded_format_ids: settings.excluded_format_ids || [], excluded_member_id: settings.excluded_member_id || null,
      only_date: settings.only_date || null, only_time_block: settings.only_time_block || null,
      start_date: settings.start_date,
    });
    setPlanResult(after); setSelectedWhatIfKey('');
    setNotice(`Applied the what-if plan with ${after.recommendations.length} event ideas.`);
  };

  const accept = async (recommendation, venue) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const settings = planResult.settings;
      const created = await apiWrite(`/api/clubs/${clubId}/events`, {
        body: {
          event_type_id: recommendation.event_type_id,
          start_time: recommendation.start,
          venue,
          event_format_id: recommendation.format_id,
          time_block: recommendation.time_block,
          delivery_mode: recommendation.mode,
          fee_inr: recommendation.fee_inr,
          planning_snapshot: {
            expected_attendance: recommendation.expected_attendance,
            expected_attendance_interval_95: recommendation.expected_attendance_interval_95,
            available_member_count: recommendation.available_member_ids.length,
            confidence: recommendation.confidence,
            settings: {
              strategy: settings.strategy,
              fairness: Boolean(settings.fairness),
              diversity: Boolean(settings.diversity),
              fee_cap_inr: settings.fee_cap_inr,
              horizon_days: settings.horizon_days,
            },
          },
        },
      });
      setNotice(`Scheduled ${created.title} for ${new Date(created.start_time).toLocaleString()}.`);
      await loadEvents();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const cancel = async (scheduled) => {
    if (!window.confirm(`Cancel ${scheduled.title} on ${new Date(scheduled.start_time).toLocaleString()}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiWrite(`/api/clubs/${clubId}/events/${scheduled.id}/cancel`);
      setNotice(`Cancelled ${scheduled.title}.`);
      await loadEvents();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const toggleAttendance = (memberId, attended) => setAttendance((current) => ({
    ...current,
    [memberId]: { attended, rating: attended ? (current[memberId]?.rating || '5') : '' },
  }));
  const saveAttendance = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const roster = members.map((member) => ({ member_id: member.id, attended: Boolean(attendance[member.id]?.attended), rating: attendance[member.id]?.attended && attendance[member.id]?.rating ? Number(attendance[member.id].rating) : null }));
      const result = await apiWrite(`/api/clubs/${clubId}/events/${selectedFeedbackEvent}/feedback`, { body: { attendees: roster } });
      setNotice(`Recorded attendance for ${result.recorded_members} club members.`);
      await loadEvents();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  return <main className="quorum-app">
    <header className="quorum-app__header"><a href="/" className="quorum-app__brand">QUORUM<span> / ORGANIZER</span></a><a href="/app/evaluation" className="quorum-app__quiet">Evaluation</a><button type="button" className="quorum-app__quiet" onClick={onLogout}>Log out</button></header>
    <section className="quorum-app__content">
      <p className="quorum-app__eyebrow">{clubName}</p><h1>Plan the next club event</h1><p className="quorum-app__intro">Choose how to balance members’ preferences, set a few practical limits, then find event ideas the club can attend.</p>
      {error && <p role="alert" className="quorum-app__error">{error}</p>}{notice && <p role="status" className="quorum-app__notice">{notice}</p>}
      <section className="quorum-app__recipes" aria-labelledby="recipe-heading">
        <div><h2 id="recipe-heading">Start with a recipe</h2><p>Pick a starting point. You can change any setting afterward.</p></div>
        <div className="quorum-app__recipe-list">
          {recipes.map((recipe) => <button className={`quorum-app__recipe${activeRecipe === recipe.id ? ' is-active' : ''}`} type="button" key={recipe.id} disabled={busy} onClick={() => applyRecipe(recipe)}>
            <strong>{recipe.label}</strong><code title="Planning engine settings">{recipe.technical_name}</code>
          </button>)}
        </div>
      </section>
      <form className="quorum-app__card quorum-app__controls" onSubmit={runPlan}>
        {Object.entries(appliedWhatIfFilters).some(([key, value]) => key !== 'start_date' && (Array.isArray(value) ? value.length : Boolean(value))) && <div className="quorum-app__applied-what-if"><span>What-if filters are applied to this plan.</span><button type="button" className="quorum-app__quiet" onClick={() => { setAppliedWhatIfFilters({}); setNotice('What-if filters cleared. Run the planner to refresh results.'); }}>Clear filters</button></div>}
        <EventRequirements formats={formats} selectedIds={selectedFormatIds} onSelectedIdsChange={setSelectedFormatIds}
          feePolicy={feePolicy} onFeePolicyChange={setFeePolicy} maxFee={maxFee} onMaxFeeChange={setMaxFee}
          deliveryMode={deliveryMode} onDeliveryModeChange={setDeliveryMode} />
        <label className="quorum-app__control quorum-app__control--strategy"><span>How should we balance member preferences?</span><select value={strategy} onChange={(event) => { setStrategy(event.target.value); setActiveRecipe(''); }}>{strategyOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>{strategyOptions.find(([value]) => value === strategy)?.[2]}</small></label>
        <label className="quorum-app__control"><span>How many ideas should we show?</span><input type="number" min="1" max="50" value={topN} onChange={(event) => setTopN(event.target.value)} /><small>Show up to this many suggestions.</small></label>
        <label className="quorum-app__control"><span>Minimum people needed</span><input type="number" min="1" max={members.length || 60} placeholder={`Club default: ${defaultQuorum}`} value={quorum} onChange={(event) => setQuorum(event.target.value)} /><small>Leave blank to use the club default ({defaultQuorum} people).</small></label>
        <label className="quorum-app__control"><span>How far ahead should we look?</span><input type="number" min="1" max="30" value={horizon} onChange={(event) => setHorizon(event.target.value)} /><small>Number of days from today.</small></label>
        <label className="quorum-app__control"><span>Experience level</span><select value={skillLevelFilter} onChange={(event) => { setSkillLevelFilter(event.target.value); setActiveRecipe(''); }}><option value="any">Any level</option><option value="beginner">Beginner-friendly formats only</option></select></label>
        <fieldset className="quorum-app__control-options"><legend>Fine-tune suggestions</legend>
          <label className="quorum-app__check"><input type="checkbox" checked={fairness} onChange={(event) => { setFairness(event.target.checked); setActiveRecipe(''); }} /><span>Give more weight to members who have been less satisfied</span></label>
          <label className="quorum-app__check"><input type="checkbox" checked={diversity} onChange={(event) => { setDiversity(event.target.checked); setActiveRecipe(''); }} /><span>Include a mix of event types</span></label>
          <label className="quorum-app__check"><input type="checkbox" checked={exploration} onChange={(event) => { setExploration(event.target.checked); setActiveRecipe(''); }} /><span>Boost formats the club has tried less often</span></label>
          <label className="quorum-app__check"><input type="checkbox" checked={excludeLabHeavyDays} onChange={(event) => { setExcludeLabHeavyDays(event.target.checked); setActiveRecipe(''); }} /><span>Avoid lab-heavy days <small>(Tuesday and Thursday; exam weeks are always excluded)</small></span></label>
          <label className="quorum-app__check"><input type="checkbox" checked={preferShortFormats} onChange={(event) => { setPreferShortFormats(event.target.checked); setActiveRecipe(''); }} /><span>Prefer shorter events</span></label>
        </fieldset>
        <button className="quorum-app__button" disabled={busy}>{planningBusy ? 'Finding ideas…' : 'Find event ideas'}</button>
      </form>

      <div className="quorum-app__sweep-action">
        <button type="button" className="quorum-app__button" disabled={busy || sweepBusy} onClick={runPlanSweep}>
          {sweepBusy ? 'Comparing plan options…' : 'Compare plan options'}
        </button>
        <small>Compare up to 12 combinations of strategy, fairness, variety, and fee limit.</small>
      </div>

      <section className="quorum-app__recommendations" id="ranked-plan-results" aria-labelledby="plan-results-heading" aria-live="polite">
        <h2 id="plan-results-heading">Event ideas</h2>
        {planningBusy && <div className="quorum-app__plan-state" role="status"><span className="quorum-app__spinner" aria-hidden="true" />Looking at member availability and event ideas…</div>}
        {!planningBusy && planResult === null && <div className="quorum-app__plan-state"><h3>Ready to find a time?</h3><p>Choose what matters to your club, then select “Find event ideas” to see formats and times that fit.</p></div>}
        {!planningBusy && planResult && planResult.recommendations.length === 0 && <div className="quorum-app__plan-state"><h3>No matching event ideas</h3><p>Try changing the event requirements or giving the club more time options.</p></div>}
        {!planningBusy && planResult?.recommendations.map((item) => {
          const key = `${item.format_id}-${item.start}-${item.mode}`;
          return <PlanResultCard key={key} item={item}
            format={formats.find((format) => format.id === item.format_id)} memberNames={memberNames} venues={pastVenues[item.mode] || []} busy={busy} onAccept={accept}
            whatIfOpen={selectedWhatIfKey === key} onToggleWhatIf={() => setSelectedWhatIfKey(selectedWhatIfKey === key ? '' : key)}
            whatIfPanel={<WhatIfPanel clubId={clubId} basePlan={planResult} item={item} formats={formats} members={members} onApply={applyWhatIf} />} />;
        })}
        {!planningBusy && planSweepResult && <ParetoPlanChart sweep={planSweepResult} memberCount={members.length}
          selectedPointId={selectedSweepPointId} onSelect={loadSweepPoint} />}
        {!planningBusy && planResult && <PlanDiagnostics planResult={planResult} members={members} formats={formats} />}
      </section>

      <section className="quorum-app__card"><h2>Scheduled events</h2>{events.filter((event) => event.status === 'scheduled').length === 0 ? <p>No scheduled events yet.</p> : <ul className="quorum-app__event-list">{events.filter((event) => event.status === 'scheduled').map((event) => <li key={event.id}><div><strong>{event.title}</strong><span>{new Date(event.start_time).toLocaleString()}{event.venue ? ` · ${event.venue}` : ''}{event.delivery_mode ? ` · ${event.delivery_mode === 'online' ? 'Online' : 'In person'}` : ''}{event.estimated_fee_inr != null ? ` · ${event.estimated_fee_inr === 0 ? 'Free' : `Estimated ₹${event.estimated_fee_inr} per person`}` : ''}</span>{event.planning_snapshot && <span title="Saved when this event was scheduled">Predicted turnout: {Math.round(event.planning_snapshot.expected_attendance)} ± {Math.round(Math.max(event.planning_snapshot.expected_attendance - event.planning_snapshot.expected_attendance_interval_95[0], event.planning_snapshot.expected_attendance_interval_95[1] - event.planning_snapshot.expected_attendance))} of {event.planning_snapshot.available_member_count}</span>}</div>{new Date(event.start_time) > new Date() && <button type="button" className="quorum-app__quiet" disabled={busy} onClick={() => cancel(event)}>Cancel event</button>}</li>)}</ul>}</section>

      <section className="quorum-app__card"><h2>Record attendance and feedback</h2><p>Select a past event, mark every club member present or absent, and rate attendees.</p><form onSubmit={saveAttendance} className="quorum-app__stack">
        <label>Past event<select value={selectedFeedbackEvent} onChange={(event) => { setSelectedFeedbackEvent(event.target.value); setAttendance({}); }} required><option value="">Choose an event</option>{pastEvents.map((event) => <option key={event.id} value={event.id}>{event.title} · {new Date(event.start_time).toLocaleString()}</option>)}</select></label>
        {selectedFeedbackEvent && <div className="quorum-app__roster">{members.map((member) => <div className="quorum-app__roster-row" key={member.id}><label className="quorum-app__check"><input type="checkbox" checked={Boolean(attendance[member.id]?.attended)} onChange={(event) => toggleAttendance(member.id, event.target.checked)} /> {member.name}</label>{attendance[member.id]?.attended && <select aria-label={`Rating for ${member.name}`} value={attendance[member.id]?.rating || '5'} onChange={(event) => setAttendance((current) => ({ ...current, [member.id]: { ...current[member.id], rating: event.target.value } }))}>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select>}</div>)}</div>}
        <button className="quorum-app__button" disabled={busy || !selectedFeedbackEvent}>Save event feedback</button>
      </form></section>
    </section>
  </main>;
}
