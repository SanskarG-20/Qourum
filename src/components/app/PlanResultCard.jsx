import React, { useState } from 'react';
import { planCardView } from './planPresentation.js';

function prettyDate(start) {
  return new Date(start).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function PlanResultCard({ item, format, memberNames, venues, busy, onAccept, whatIfOpen, onToggleWhatIf, whatIfPanel }) {
  const view = planCardView(item);
  const [selectedVenue, setSelectedVenue] = useState('');
  const [typedVenue, setTypedVenue] = useState('');
  const venue = typedVenue.trim() || selectedVenue || null;

  const submit = (event) => {
    event.preventDefault();
    onAccept(item, venue);
  };

  return <article className="quorum-app__card quorum-app__plan-card">
    <div className="quorum-app__plan-card-head">
      <div>
        <p className="quorum-app__eyebrow">EVENT IDEA</p>
        <h3>{format?.name || item.format_id}</h3>
        <p className="quorum-app__plan-date"><span>{item.time_block.replaceAll('_', ' ')}</span> · {prettyDate(item.start)}</p>
      </div>
      {item.confidence === 'low' && <span className="quorum-app__confidence" title="Low confidence: there is limited past feedback for this estimate.">Early estimate</span>}
    </div>

    <div className="quorum-app__plan-facts">
      <span>{item.mode === 'online' ? 'Online' : 'In person'}</span>
      <span>{item.fee_inr === 0 ? 'Free' : `₹${Number(item.fee_inr).toLocaleString('en-IN')} per person`}</span>
      <span title="Expected attendance with the engine's 95% prediction interval">Expected turnout: <strong>{view.turnout}</strong></span>
    </div>

    <p className="quorum-app__plan-why"><strong>Why this?</strong> {view.why}</p>

    <div className="quorum-app__satisfaction">
      <h4>Member interest ({view.members.length})</h4>
      <ul className="quorum-app__satisfaction-list">
        {view.members.map((member) => <li className={member.isLowest ? 'is-lowest' : ''} key={member.memberId}>
          <span className="quorum-app__member-label">
            {memberNames[member.memberId] || member.memberId}
            {member.isLowest && <strong className="quorum-app__lowest-label">Lowest</strong>}
          </span>
          {member.available ? <>
            <span className="quorum-app__meter" role="img" aria-label={`${memberNames[member.memberId] || member.memberId}: ${member.percent}% interest`} title={`Engine satisfaction score: ${member.score.toFixed(4)}`}>
              <span style={{ width: `${member.percent}%` }} />
            </span>
            <strong className="quorum-app__member-percent">{member.percent}%</strong>
          </> : <span className="quorum-app__unscored" title={member.unavailableReasons.join(', ') || 'This member could not attend this time.'}>Not available</span>}
        </li>)}
      </ul>
    </div>

    {onToggleWhatIf && <button type="button" className="quorum-app__quiet" aria-expanded={Boolean(whatIfOpen)} onClick={onToggleWhatIf}>{whatIfOpen ? 'Close what-if' : 'Try a what-if'}</button>}
    {whatIfOpen && whatIfPanel}
    <form className="quorum-app__plan-accept" onSubmit={submit}>
      <details className="quorum-app__venue-picker">
        <summary>Venue (optional)</summary>
        <label>Choose a previous venue
          <select value={selectedVenue} onChange={(event) => { setSelectedVenue(event.target.value); setTypedVenue(''); }}>
            <option value="">Leave blank</option>
            {venues.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>Or enter a venue
          <input value={typedVenue} onChange={(event) => { setTypedVenue(event.target.value); if (event.target.value) setSelectedVenue(''); }} placeholder="Optional" maxLength={200} />
        </label>
      </details>
      <button className="quorum-app__button" type="submit" disabled={busy}>Accept and schedule</button>
    </form>
  </article>;
}
