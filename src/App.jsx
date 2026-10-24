import React, { Suspense, lazy } from 'react';

const LandingPage = lazy(() => import('./LandingPage.jsx'));
const QuorumMemberApp = lazy(() => import('./components/app/MemberOnboarding.jsx').then((module) => ({ default: module.QuorumMemberApp })));

export default function App() {
  const isApp = window.location.pathname.startsWith('/app');
  return (
    <Suspense fallback={null}>
      {isApp ? <QuorumMemberApp /> : <LandingPage />}
    </Suspense>
  );
}
