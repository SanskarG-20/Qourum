import React, { useEffect, useMemo, useState } from 'react';
import './member-onboarding.css';
import { api, apiWrite } from '../../utils/apiClient.js';
import { EventRequirements } from './EventRequirements.jsx';

export function OrganizerWorkflow({ clubId, clubName, onLogout }) {
  const [strategy, setStrategy] = useState('average');
  const [topN, setTopN] = useState(10);
  const [quorum, setQuorum] = useState('');
  const [horizon, setHorizon] = useState(21);
  const [fairness, setFairness] = useState(true);
  const [diversity, setDiversity] = useState(true);
  const [formats, setFormats] = useState([]);
  const [selectedFormatIds, setSelectedFormatIds] = useState([]);
  const [feePolicy, setFeePolicy] = useState('any');
  const [maxFee, setMaxFee] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('any');
  const [recommendations, setRecommendations] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedFeedbackEvent, setSelectedFeedbackEvent] = useState('');
  const [attendance, setAttendance] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const membersById = useMemo(() => Object.fromEntries(members.map((member) => [member.id, member])), [members]);
  const pastEvents = events.filter((event) => new Date(event.start_time) < new Date() && event.status !== 'cancelled');
  const defaultQuorum = Math.max(5, Math.ceil(.3 * members.length)) || 5;
  const strategyOptions = [
    ['average', 'Balance everyone’s preferences', 'Give each member’s predicted interest equal weight.'],
    ['least_misery', 'Look after the least interested', 'Favor ideas that the least interested members are more likely to enjoy.'],
    ['most_pleasure', 'Prioritize the biggest fans', 'Give more weight to members predicted to be especially interested.'],
    ['multiplicative', 'Find broad agreement', 'Favor ideas that many members are predicted to enjoy.'],
    ['borda', 'Use everyone’s ranking', 'Combine each member’s ranking of the possible ideas.'],
    ['approval', 'Count likely yes votes', 'Favor ideas that more members are predicted to approve.'],
    ['average_without_misery', 'Balance support, setting aside very low scores', 'Average members’ scores after leaving out very low predicted interest.'],
  ];

  const loadEvents = async () => setEvents(await api(`/api/clubs/${clubId}/events`));
  useEffect(() => {
    Promise.all([api(`/api/clubs/${clubId}/events`), api(`/api/clubs/${clubId}/members`), api(`/api/clubs/${clubId}/event-formats`)]).then(([loadedEvents, loadedMembers, catalog]) => {
      setEvents(loadedEvents); setMembers(loadedMembers); setFormats(catalog.formats);
    }).catch((reason) => setError(reason.message));
  }, [clubId]);

  const runRecommendations = async (event) => {
    event?.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiWrite(`/api/clubs/${clubId}/recommendations`, {
        body: { strategy, top_n: Number(topN), quorum: quorum ? Number(quorum) : null, horizon_days: Number(horizon), fairness, diversity,
          format_ids: selectedFormatIds, fee_policy: feePolicy, max_fee_inr: maxFee === '' ? null : Number(maxFee), delivery_mode: deliveryMode },
      });
      setRecommendations(result.recommendations);
      if (!result.recommendations.length) setNotice(result.message || 'No candidates met the selected constraints.');
      else setNotice(`Found ${result.feasible_count} event plans that fit your choices.`);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const accept = async (recommendation) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const created = await apiWrite(`/api/clubs/${clubId}/events`, {
        body: { event_type_id: recommendation.event_type_id, start_time: recommendation.start, venue: recommendation.venue,
          event_format_id: recommendation.event_format_id || null, delivery_mode: recommendation.delivery_mode || 'in_person' },
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
    <header className="quorum-app__header"><a href="/" className="quorum-app__brand">QUORUM<span> / ORGANIZER</span></a><button type="button" className="quorum-app__quiet" onClick={onLogout}>Log out</button></header>
    <section className="quorum-app__content">
      <p className="quorum-app__eyebrow">{clubName}</p><h1>Plan the next club event</h1><p className="quorum-app__intro">Choose how to balance members’ preferences, set a few practical limits, then find event ideas the club can attend.</p>
      {error && <p role="alert" className="quorum-app__error">{error}</p>}{notice && <p role="status" className="quorum-app__notice">{notice}</p>}
      <form className="quorum-app__card quorum-app__controls" onSubmit={runRecommendations}>
        <EventRequirements formats={formats} selectedIds={selectedFormatIds} onSelectedIdsChange={setSelectedFormatIds}
          feePolicy={feePolicy} onFeePolicyChange={setFeePolicy} maxFee={maxFee} onMaxFeeChange={setMaxFee}
          deliveryMode={deliveryMode} onDeliveryModeChange={setDeliveryMode} />
        <label className="quorum-app__control quorum-app__control--strategy"><span>How should we choose ideas?</span><select value={strategy} onChange={(e) => setStrategy(e.target.value)}>{strategyOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><small>{strategyOptions.find(([value]) => value === strategy)?.[2]}</small></label>
        <label className="quorum-app__control"><span>How many ideas should we show?</span><input type="number" min="1" max="50" value={topN} onChange={(e) => setTopN(e.target.value)} /><small>Show up to this many suggestions.</small></label>
        <label className="quorum-app__control"><span>Minimum people needed</span><input type="number" min="1" max={members.length || 60} placeholder={`Club default: ${defaultQuorum}`} value={quorum} onChange={(e) => setQuorum(e.target.value)} /><small>Leave blank to use the club default ({defaultQuorum} people).</small></label>
        <label className="quorum-app__control"><span>How far ahead should we look?</span><input type="number" min="1" max="90" value={horizon} onChange={(e) => setHorizon(e.target.value)} /><small>Number of days from today.</small></label>
        <fieldset className="quorum-app__control-options"><legend>Fine-tune suggestions</legend>
          <label className="quorum-app__check"><input type="checkbox" checked={fairness} onChange={(e) => setFairness(e.target.checked)} /><span>Give a boost to members who have been less satisfied</span></label>
          <label className="quorum-app__check"><input type="checkbox" checked={diversity} onChange={(e) => setDiversity(e.target.checked)} /><span>Include a mix of event types</span></label>
        </fieldset>
        <button className="quorum-app__button" disabled={busy}>{busy ? 'Finding ideas…' : 'Find event ideas'}</button>
      </form>

      <div className="quorum-app__recommendations"><h2>Ranked recommendations</h2>{recommendations.map((item) => <article className="quorum-app__card quorum-app__recommendation" key={`${item.event_format_id}-${item.start}-${item.venue}`}>
        <div className="quorum-app__rec-head"><div><p className="quorum-app__eyebrow">RANK {item.rank} · {item.venue}</p><h3>{item.event_type}</h3><p>{new Date(item.start).toLocaleString()} · {item.duration_minutes} minutes</p></div><button className="quorum-app__button" type="button" disabled={busy} onClick={() => accept(item)}>Accept and schedule</button></div>
        <p className="quorum-app__plan-details">{item.delivery_mode === 'online' ? 'Online' : 'In person'} · {item.estimated_fee_inr === 0 ? 'Free' : `Estimated ₹${item.estimated_fee_inr} per person`} <small>(synthetic demo estimate)</small></p>
        <p className="quorum-app__recommendation-stats">Group mean {item.group_mean.toFixed(3)} · minimum {item.group_min.toFixed(3)} · spread {item.group_std.toFixed(3)} · expected attendance {item.expected_attendance.toFixed(2)} / quorum {item.quorum_required}</p>
        <p className="quorum-app__explanation">{item.explanation}</p>
        <details><summary>Per-member satisfaction ({Object.keys(item.evidence.per_member_satisfaction).length})</summary><ul className="quorum-app__member-scores">{Object.entries(item.evidence.per_member_satisfaction).map(([id, score]) => <li key={id}>{membersById[id]?.name || id}<strong>{score.toFixed(3)}</strong></li>)}</ul></details>
        {item.why_not.length > 0 && <details><summary>Why not these alternatives?</summary><ul className="quorum-app__counterfactuals">{item.why_not.map((alternative, index) => <li key={index}>{alternative.text}</li>)}</ul></details>}
      </article>)}</div>

      <section className="quorum-app__card"><h2>Scheduled events</h2>{events.filter((event) => event.status === 'scheduled').length === 0 ? <p>No scheduled events yet.</p> : <ul className="quorum-app__event-list">{events.filter((event) => event.status === 'scheduled').map((event) => <li key={event.id}><strong>{event.title}</strong><span>{new Date(event.start_time).toLocaleString()} · {event.venue}{event.estimated_fee_inr != null ? ` · ${event.estimated_fee_inr === 0 ? 'Free' : `Estimated ₹${event.estimated_fee_inr} per person`}` : ''}</span>{new Date(event.start_time) > new Date() && <button type="button" className="quorum-app__quiet" disabled={busy} onClick={() => cancel(event)}>Cancel event</button>}</li>)}</ul>}</section>

      <section className="quorum-app__card"><h2>Record attendance and feedback</h2><p>Select a past event, mark every club member present or absent, and rate attendees.</p><form onSubmit={saveAttendance} className="quorum-app__stack">
        <label>Past event<select value={selectedFeedbackEvent} onChange={(e) => { setSelectedFeedbackEvent(e.target.value); setAttendance({}); }} required><option value="">Choose an event</option>{pastEvents.map((event) => <option key={event.id} value={event.id}>{event.title} · {new Date(event.start_time).toLocaleString()}</option>)}</select></label>
        {selectedFeedbackEvent && <div className="quorum-app__roster">{members.map((member) => <div className="quorum-app__roster-row" key={member.id}><label className="quorum-app__check"><input type="checkbox" checked={Boolean(attendance[member.id]?.attended)} onChange={(e) => toggleAttendance(member.id, e.target.checked)} /> {member.name}</label>{attendance[member.id]?.attended && <select aria-label={`Rating for ${member.name}`} value={attendance[member.id]?.rating || '5'} onChange={(e) => setAttendance((current) => ({ ...current, [member.id]: { ...current[member.id], rating: e.target.value } }))}>{[1,2,3,4,5].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select>}</div>)}</div>}
        <button className="quorum-app__button" disabled={busy || !selectedFeedbackEvent}>Save event feedback</button>
      </form></section>
    </section>
  </main>;
}
