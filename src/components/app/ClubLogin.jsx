import React, { useRef } from 'react';

const DEMO_ACCOUNTS = [
  {
    role: 'Organizer',
    email: 'organizer.acm@quorum.local',
    password: 'QuorumOrganizer42!',
    description: 'Get group recommendations, schedule an event, and record attendance.',
  },
  {
    role: 'Member',
    email: 'member.acm@quorum.local',
    password: 'QuorumMember42!',
    description: 'Set your interests and availability, then RSVP to club events.',
  },
];

export function ClubLogin({ email, password, onEmailChange, onPasswordChange, onSubmit, busy, error }) {
  const formRef = useRef(null);

  const selectDemo = (account) => {
    onEmailChange(account.email);
    onPasswordChange(account.password);
    if (window.matchMedia('(max-width: 800px)').matches) {
      formRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <section className="quorum-app__login" aria-labelledby="club-login-title">
      <div className="quorum-app__login-heading">
        <p className="quorum-app__eyebrow">ACM &amp; ROBOTICS GUILD · LOCAL DEMO</p>
        <h1 id="club-login-title">Plan better, together.</h1>
        <p>Choose a demo role to explore Quorum’s club workflow. Your selection fills the sign-in form below.</p>
      </div>

      <div className="quorum-app__login-layout">
      <div className="quorum-app__demo-accounts" aria-label="Demo accounts">
        {DEMO_ACCOUNTS.map((account) => (
          <article className="quorum-app__demo-account" key={account.role}>
            <div className="quorum-app__demo-account-top">
              <span className="quorum-app__demo-role">{account.role}</span>
              <span className="quorum-app__demo-club">ACM CLUB</span>
            </div>
            <p>{account.description}</p>
            <dl className="quorum-app__demo-credentials">
              <div><dt>Email</dt><dd>{account.email}</dd></div>
              <div><dt>Password</dt><dd>{account.password}</dd></div>
            </dl>
            <button
              type="button"
              className="quorum-app__demo-select"
              onClick={() => selectDemo(account)}
            >
              Use {account.role.toLowerCase()} demo <span aria-hidden="true">↗</span>
            </button>
          </article>
        ))}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="quorum-app__card quorum-app__login-form quorum-app__stack">
        <div>
          <p className="quorum-app__eyebrow">CLUB ACCESS</p>
          <h2>Sign in to Quorum</h2>
        </div>
        {error && <p role="alert" className="quorum-app__error">{error}</p>}
        <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => onEmailChange(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => onPasswordChange(event.target.value)} required /></label>
        <button type="submit" className="quorum-app__button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to club'}</button>
      </form>
      </div>
    </section>
  );
}
