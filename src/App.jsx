import React, { useState, useMemo } from 'react';
import { NAV_ITEMS } from './config/siteConfig.js';
import { SAMPLE_CLUBS } from './data/clubsDataset.js';
import { MEDIA_ASSETS } from './assets/mediaAssets.js';
import { useActiveSection } from './hooks/useScrollReveal.js';
import { TopNavbar } from './components/layout/TopNavbar.jsx';
import { RulerBar } from './components/layout/RulerBar.jsx';
import { CustomCursorLayer } from './components/layout/CustomCursorLayer.jsx';
import { IntroSplashBubble } from './components/sections/IntroSplashBubble.jsx';
import { HeroSection } from './components/sections/HeroSection.jsx';
import { ProblemSection } from './components/sections/ProblemSection.jsx';
import { PipelineFolderStack } from './components/sections/PipelineFolderStack.jsx';
import { DemoLabSection } from './components/sections/DemoLabSection.jsx';
import { EvaluationSection } from './components/sections/EvaluationSection.jsx';
import { PlaygroundSurveySection } from './components/sections/PlaygroundSurveySection.jsx';
import { LetsTalkFooter } from './components/sections/LetsTalkFooter.jsx';

export default function App() {
  const sectionIds = useMemo(() => NAV_ITEMS.map((item) => item.id), []);
  const [activeSection, setActiveSection] = useActiveSection(sectionIds);

  // Global Interactive Quorum State shared across Hero HUD, Demo Lab, Evaluation, and Survey
  const [workingTitleId, setWorkingTitleId] = useState('QUORUM');
  const [clubs, setClubs] = useState(SAMPLE_CLUBS);
  const [selectedClubId, setSelectedClubId] = useState('CLUB-01');
  const [strategy, setStrategy] = useState('fairness_aware');
  const [modelType, setModelType] = useState('hybrid_mf');
  const [thresholdPct, setThresholdPct] = useState(50);
  const [surveyFocused, setSurveyFocused] = useState(false);
  const [introCompleted, setIntroCompleted] = useState(false);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleInspectModuleInDemo = (target) => {
    if (target === 'evaluation') {
      scrollToSection('evaluation');
      return;
    }
    scrollToSection('demo-lab');
  };

  const handleLoadClubRegime = (clubId) => {
    setSelectedClubId(clubId);
    scrollToSection('demo-lab');
  };

  const handleAddSurveyMember = (newMember) => {
    setClubs((prev) =>
      prev.map((c) => {
        if (c.club_id !== selectedClubId) return c;
        return {
          ...c,
          members: [...c.members, newMember],
        };
      })
    );
  };

  return (
    <div className="canvas-grid-bg" style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Global Multiplayer 'YOU' Cursor & Contextual 'See' Circle */}
      <CustomCursorLayer />

      {/* Initial Speech-Bubble Preloader ('Planning a club event?' -> 'Welcome to Qourum') */}
      <IntroSplashBubble onComplete={() => setIntroCompleted(true)} />

      {/* Persistent Sticky 62px Top Utility Navbar */}
      <TopNavbar
        activeSection={activeSection}
        onSelectSection={scrollToSection}
        organizerAvatar={MEDIA_ASSETS.organizerPortrait}
        onOpenSurveyModal={() => {
          setSurveyFocused(true);
          scrollToSection('playground');
        }}
      />

      {/* Persistent 49px Horizontal CAD Pixel Ruler Bar */}
      <RulerBar position="top" />

      {/* Main Content Landmark */}
      <main>
        {/* 1. Hero Stage (QUORUM Selection Box, Difference-Blend Hover Lens, Inline Icons, HUD Slider) */}
        <HeroSection
          workingTitleId={workingTitleId}
          onChangeWorkingTitle={setWorkingTitleId}
          thresholdPct={thresholdPct}
          onChangeThreshold={setThresholdPct}
          organizerAvatar={MEDIA_ASSETS.organizerPortrait}
          onJumpToDemo={() => scrollToSection('demo-lab')}
          introCompleted={introCompleted}
        />

        {/* 2. Problem & 4 Core Pillars (Scribble Divider, Inline-Media Statement, Polaroids, 2x2 Blocks) */}
        <ProblemSection
          organizerPortrait={MEDIA_ASSETS.organizerPortrait}
          workspaceDesk={MEDIA_ASSETS.workspaceDesk}
          onSelectPillar={(pillarId) => {
            if (pillarId === 'aggregation') setStrategy('least_misery');
            scrollToSection('demo-lab');
          }}
        />

        {/* 3. Sticky Folder-Tab Pipeline Stack (4 Staggered 1650px Cards for Modules A-F) */}
        <PipelineFolderStack
          mediaAssets={MEDIA_ASSETS}
          onInspectModuleInDemo={handleInspectModuleInDemo}
        />

        {/* 4. Interactive Recommender Demo Lab & CSV Schema Validator (FR-001 to FR-019) */}
        <DemoLabSection
          clubs={clubs}
          selectedClubId={selectedClubId}
          onSelectClub={setSelectedClubId}
          strategy={strategy}
          onChangeStrategy={setStrategy}
          modelType={modelType}
          onChangeModelType={setModelType}
          thresholdPct={thresholdPct}
          onChangeThresholdPct={setThresholdPct}
        />

        {/* 5. Evaluation Harness & Synthetic Conflict Regimes (Jagged Bands, Benchmark Table, 3 Phone Cards) */}
        <EvaluationSection onLoadClubRegime={handleLoadClubRegime} />

        {/* 6. Interactive FR-001 Member Survey Dry-Run & Section 17.3 Open Questions Q&A */}
        <PlaygroundSurveySection
          organizerAvatar={MEDIA_ASSETS.organizerPortrait}
          onAddSurveyMember={handleAddSurveyMember}
          surveyModalOpen={surveyFocused}
          onCloseSurveyModal={() => setSurveyFocused(false)}
        />
      </main>

      {/* 7. Let's RankMascot Split, Comment Card, Striped Hover-Inverting Banner & Bottom Ruler */}
      <LetsTalkFooter
        organizerAvatar={MEDIA_ASSETS.organizerPortrait}
        onJumpToDemo={() => scrollToSection('demo-lab')}
      />
    </div>
  );
}
