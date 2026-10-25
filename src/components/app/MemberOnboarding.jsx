import React, { useEffect, useMemo, useState } from 'react';
import './member-onboarding.css';
import { OrganizerWorkflow } from './OrganizerWorkflow.jsx';
import { ClubLogin } from './ClubLogin.jsx';
import { api as request, apiWrite } from '../../utils/apiClient.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 15 }, (_, index) => index + 8);

function MemberEventRsvps({ clubId }) {
  const [events, setEvents] = useState([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const refresh = () => request(`/api/clubs/${clubId}/events`).then(setEvents).catch((reason) => setError(reason.message));
  useEffect(() => { refresh(); }, [clubId]);
  const respond = async (eventId, status) => {
    setError(''); setNotice('');
    try {
      await apiWrite(`/api/clubs/${clubId}/events/${eventId}/rsvp`, { body: { status } });
      setNotice('Your RSVP has been saved.'); await refresh();
    } catch (reason) { setError(reason.message); }
  };
  const upcoming = events.filter((event) => event.status === 'scheduled' && new Date(event.start_time) > new Date());
  return <section className="quorum-app__card quorum-app__member-events"><h2>Upcoming club events</h2>
    {error && <p role="alert" className="quorum-app__error">{error}</p>}{notice && <p role="status" className="quorum-app__notice">{notice}</p>}
    {upcoming.length === 0 ? <p>No upcoming events have been scheduled.</p> : <ul className="quorum-app__event-list">{upcoming.map((event) => <li key={event.id}><div><strong>{event.title}</strong><span>{new Date(event.start_time).toLocaleString()} · {event.venue}</span></div><div className="quorum-app__rsvp-actions">{['yes', 'maybe', 'no'].map((status) => <button type="button" className={event.my_rsvp === status ? 'is-selected' : ''} key={status} onClick={() => respond(event.id, status)}>{status}</button>)}</div></li>)}</ul>}
  </section>;
}

export function QuorumMemberApp() {
  const [user, setUser] = useState(null);
  const [clubId, setClubId] = useState('');
  const [clubName, setClubName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [types, setTypes] = useState([]);
  const [ratings, setRatings] = useState({});
  const [windows, setWindows] = useState([]);
  const [latestStart, setLatestStart] = useState('21:00');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const weekdays = useMemo(() => DAYS.map((day, index) => ({ day, index })), []);

  const loadOnboarding = async (selectedClubId) => {
    const result = await request(`/api/clubs/${selectedClubId}/onboarding`);
    setTypes(result.event_types);
    setRatings(Object.fromEntries(result.preferences.map((item) => [item.event_type_id, String(item.rating)])));
    setWindows(result.availability);
    setLatestStart(result.latest_start_time || '21:00');
    if (result.is_cold_start) setNotice('Cold-start profile: recommendations can fall back to the typical club attendance rate until your own history builds.');
  };

  useEffect(() => {
    request('/api/auth/me').then(({ user: current }) => {
      setUser(current);
      const club = current.clubs[0];
      if (club) {
        setClubId(club.id);
        setClubName(club.name);
        return loadOnboarding(club.id);
      }
    }).catch(() => {});
  }, []);

  const login = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = await apiWrite('/api/auth/login', { body: { email, password } });
      setUser(result.user);
      const club = result.user.clubs[0];
      if (club) { setClubId(club.id); setClubName(club.name); await loadOnboarding(club.id); }
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const setWindow = (day, hour, enabled) => {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const end = `${String(hour + 1).padStart(2, '0')}:00`;
    setWindows((previous) => enabled
      ? [...previous, { day_of_week: day, start_time: start, end_time: end }].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
      : previous.filter((item) => !(item.day_of_week === day && item.start_time === start && item.end_time === end)));
  };

  const save = async (event) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      const preferences = Object.entries(ratings).filter(([, rating]) => rating).map(([event_type_id, rating]) => ({ event_type_id, rating: Number(rating) }));
      const result = await apiWrite(`/api/clubs/${clubId}/onboarding`, { method: 'PUT', body: { preferences, availability: windows, latest_start_time: latestStart || null } });
      setNotice(`Saved ${result.preferences.length} ratings and ${result.availability.length} availability windows.`);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const logout = async () => {
    try {
      await apiWrite('/api/auth/logout');
    } finally { setUser(null); setClubId(''); }
  };

  const activeClub = user?.clubs.find((club) => club.id === clubId);
  if (user && activeClub?.role === 'organizer') {
    return <OrganizerWorkflow clubId={clubId} clubName={clubName} onLogout={logout} />;
  }

  return <main className="quorum-app">
    <header className="quorum-app__header"><a href="/" className="quorum-app__brand">QUORUM<span> / {user ? 'MEMBER SETUP' : 'CLUB LOGIN'}</span></a>{user && <button type="button" className="quorum-app__quiet" onClick={logout}>Log out</button>}</header>
    {!user ? <ClubLogin email={email} password={password} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={login} busy={busy} error={error} /> : <section className="quorum-app__content">
      <p className="quorum-app__eyebrow">{clubName || 'YOUR CLUB'}</p><h1>Set your planning preferences</h1><p className="quorum-app__intro">Your ratings and free time help the club find a date and event everyone can attend.</p>
      {notice && <p role="status" className="quorum-app__notice">{notice}</p>}{error && <p role="alert" className="quorum-app__error">{error}</p>}
      <form onSubmit={save} className="quorum-app__stack">
        <section className="quorum-app__card"><h2>Event interests</h2><p>Rate each event type from 1 (not interested) to 5 (very interested).</p><div className="quorum-app__ratings">{types.map((type) => <label key={type.id}>{type.name}<select value={ratings[type.id] || ''} onChange={(event) => setRatings((current) => ({ ...current, [type.id]: event.target.value }))}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label>)}</div></section>
        <section className="quorum-app__card"><h2>Weekly availability</h2><p>Choose one-hour windows when you are usually free.</p><div className="quorum-app__grid"><span />{HOURS.map((hour) => <span key={hour} className="quorum-app__hour">{hour}:00</span>)}{weekdays.map(({ day, index }) => <React.Fragment key={day}><strong>{day.slice(0, 3)}</strong>{HOURS.map((hour) => { const start = `${String(hour).padStart(2, '0')}:00`; const active = windows.some((item) => item.day_of_week === index && item.start_time === start); return <input key={hour} aria-label={`${day} ${start}`} type="checkbox" checked={active} onChange={(event) => setWindow(index, hour, event.target.checked)} />; })}</React.Fragment>)}</div></section>
        <section className="quorum-app__card"><h2>Scheduling dealbreaker</h2><label className="quorum-app__inline">I cannot start an event after <input type="time" value={latestStart} onChange={(event) => setLatestStart(event.target.value)} /></label><button type="button" className="quorum-app__quiet" onClick={() => setLatestStart('')}>No latest-start limit</button></section>
        <button className="quorum-app__button" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'}</button>
      </form>
      <MemberEventRsvps clubId={clubId} />
    </section>}
  </main>;
}
