import React, { useState } from 'react';

export function EventRequirements({ formats, selectedIds, onSelectedIdsChange, feePolicy, onFeePolicyChange, maxFee, onMaxFeeChange, deliveryMode, onDeliveryModeChange }) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = normalizedQuery
    ? formats.filter((item) => item.name.toLocaleLowerCase().includes(normalizedQuery))
    : showAll ? formats : formats.filter((item, index) => index < 6 || selectedIds.includes(item.id));

  const toggle = (id) => {
    onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  };

  return <fieldset className="quorum-app__requirements">
    <legend>Event requirements</legend>
    <p>Tell us what your club has in mind. You can leave every choice open for a wider range of ideas.</p>
    <div className="quorum-app__requirements-fields">
      <div className="quorum-app__format-picker">
        <label className="quorum-app__control" htmlFor="event-format-search"><span>What kind of event?</span><input id="event-format-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hackathon, quest, quiz…" /><small>Choose one or more formats, or leave all unselected for any type. New formats use related club history until they have their own feedback.</small></label>
        <div className="quorum-app__format-list" role="group" aria-label="Event formats">
          {filtered.map((item) => <label className="quorum-app__format-option" key={item.id}>
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} />
            <span>{item.name}</span>
          </label>)}
          {filtered.length === 0 && <p>No matching format. Try another search term.</p>}
        </div>
        {!normalizedQuery && !showAll && formats.length > 6 && <button className="quorum-app__quiet quorum-app__browse-formats" type="button" onClick={() => setShowAll(true)}>Browse all {formats.length} formats</button>}
        {selectedIds.length > 0 && <button className="quorum-app__quiet quorum-app__browse-formats" type="button" onClick={() => onSelectedIdsChange([])}>Clear selected formats</button>}
      </div>
      <div className="quorum-app__requirements-limits">
        <label className="quorum-app__control"><span>Should people pay to join?</span><select value={feePolicy} onChange={(event) => { onFeePolicyChange(event.target.value); if (event.target.value === 'free') onMaxFeeChange(''); }}><option value="any">Free or paid is fine</option><option value="free">Free only</option><option value="paid">Paid events only</option></select></label>
        {feePolicy !== 'free' && <label className="quorum-app__control"><span>Maximum entry fee per person (₹)</span><input type="number" min={feePolicy === 'paid' ? '1' : '0'} max="100000" step="1" inputMode="numeric" value={maxFee} onChange={(event) => onMaxFeeChange(event.target.value)} placeholder="No limit" /><small>Leave blank if you have no price limit.</small></label>}
        <label className="quorum-app__control"><span>Where should it happen?</span><select value={deliveryMode} onChange={(event) => onDeliveryModeChange(event.target.value)}><option value="any">In person or online</option><option value="in_person">In person only</option><option value="online">Online only</option></select></label>
        <p className="quorum-app__demo-fee-note">Entry fees are synthetic demo estimates. Confirm the real cost before scheduling.</p>
      </div>
    </div>
  </fieldset>;
}
