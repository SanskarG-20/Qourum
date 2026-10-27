import React, { Suspense, lazy } from 'react';

const LandingPage = lazy(() => import('./LandingPage.jsx'));
const QuorumMemberApp = lazy(() => import('./components/app/MemberOnboarding.jsx').then((module) => ({ default: module.QuorumMemberApp })));
const EvaluationPage = lazy(() => import('./components/app/EvaluationPage.jsx'));

export default function App() {
  const isApp = window.location.pathname.startsWith('/app');
  return (
    <Suspense fallback={null}>
      {window.location.pathname === '/app/evaluation' ? <EvaluationPage /> : isApp ? <QuorumMemberApp /> : <LandingPage />}
    </Suspense>
  );
}
