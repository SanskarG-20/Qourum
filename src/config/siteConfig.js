// Configuration & PRD Constants for Quorum (RS_Mini Project 2026-27)

export const WORKING_TITLES = [
  { id: 'QUORUM', label: 'QUORUM', tag: 'Working Title (Default)', subtitle: 'Group-Aware Event Recommendation for College Clubs' },
  { id: 'CLUBSYNC', label: 'CLUBSYNC', tag: 'Alternative Title #1', subtitle: 'Synchronizing Member Preferences & Hard Slot Constraints' },
  { id: 'HUDDLE', label: 'HUDDLE', tag: 'Alternative Title #2', subtitle: 'Fair, Explainable Event Decisions for Student Organizations' },
];

export const NAV_ITEMS = [
  { id: 'home', label: 'HOME', icon: 'home', href: '#home' },
  { id: 'problem', label: 'PROBLEM', icon: 'asterisk', href: '#problem' },
  { id: 'pipeline', label: 'PIPELINE', icon: 'spool', href: '#pipeline' },
  { id: 'demo-lab', label: 'DEMO LAB', icon: 'stack', href: '#demo-lab' },
  { id: 'evaluation', label: 'EVALUATION', icon: 'branch', href: '#evaluation' },
  { id: 'playground', label: 'SURVEY & FAQ', icon: 'stairs', href: '#playground' },
];

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TIME_SLOTS = [
  { id: 'morning', label: 'Morning', window: '09:00–11:00', short: 'MORN' },
  { id: 'midday', label: 'Midday', window: '12:00–14:00', short: 'MID' },
  { id: 'afternoon', label: 'Afternoon', window: '15:00–17:00', short: 'AFT' },
  { id: 'evening', label: 'Evening', window: '18:00–20:00', short: 'EVE' },
  { id: 'late_evening', label: 'Late Eve', window: '20:30–22:00', short: 'LATE' },
];

export const EVENT_TYPES = [
  { id: 'workshop', label: 'Hands-On Workshop', category: 'Technical', icon: '⚡', color: '#42D2ED' },
  { id: 'talk', label: 'Speaker / Lightning Talk', category: 'Seminar', icon: '🎙️', color: '#E5B433' },
  { id: 'hackathon', label: 'Mini-Hackathon / Build Jam', category: 'Sprint', icon: '🛠️', color: '#D0075A' },
  { id: 'quiz', label: 'Trivia & Domain Quiz', category: 'Competition', icon: '🧩', color: '#3BCF81' },
  { id: 'social', label: 'Icebreaker & Mixer Social', category: 'Community', icon: '🍕', color: '#42D2ED' },
];

export const AGGREGATION_STRATEGIES = [
  {
    id: 'average',
    code: 'FR-009',
    name: 'Average Aggregation',
    shortName: 'Average (Mean)',
    formula: 'S_group(e, s) = (1 / |A_s|) * Σ_{m ∈ A_s} p(m, e, s)',
    description: 'Maximizes overall utilitarian mean score across available members, but risks ignoring a dissatisfied minority in polarized clubs.',
    badgeColor: '#42D2ED',
  },
  {
    id: 'least_misery',
    code: 'FR-010',
    codeRef: 'FR-010',
    name: 'Least-Misery Aggregation',
    shortName: 'Least Misery (Min)',
    formula: 'S_group(e, s) = min_{m ∈ A_s} p(m, e, s)',
    description: 'Maximizes the lowest individual member satisfaction score among available members so no attendee feels excluded.',
    badgeColor: '#E5B433',
  },
  {
    id: 'fairness_aware',
    code: 'FR-011',
    name: 'Fairness-Aware Aggregation',
    shortName: 'Fairness-Aware',
    formula: 'S_group(e, s) = Σ w_m · p(m, e, s) − λ · Var({p(m, e, s)})',
    description: 'Weights members inversely by historical satisfaction in prior rounds and penalizes intra-group variance (λ = 0.35).',
    badgeColor: '#D0075A',
  },
];

export const PREFERENCE_MODELS = [
  { id: 'hybrid_mf', label: 'Hybrid MF + Item-Mean (Main FR-008)', isBaseline: false },
  { id: 'item_mean', label: 'Content / Item-Mean (FR-008)', isBaseline: false },
  { id: 'popularity', label: 'Most-Popular Baseline (FR-007)', isBaseline: true },
  { id: 'repeat_last', label: 'Repeat-Last-Event Baseline (FR-007)', isBaseline: true },
  { id: 'random', label: 'Seeded Random Baseline (FR-007)', isBaseline: true },
];

export const PRD_OPEN_QUESTIONS = [
  {
    id: 'OQ-1',
    question: 'Final project name: Quorum, ClubSync, Huddle, or other?',
    userRole: 'Course Evaluator / Stakeholder (Sec 17.3 #1)',
    reactionIcon: '⚡',
    reactionCount: 3,
    avatarBg: '#E5B433',
    options: ['Quorum (Confirmed Default)', 'ClubSync', 'Huddle'],
    defaultAnswer: 'Quorum leads as our primary working title because it directly captures both minimum availability thresholds and collective group consensus. You can preview all three titles live in the Hero HUD bar.',
  },
  {
    id: 'OQ-2',
    question: 'Why not just use a Doodle poll or WhatsApp vote?',
    userRole: 'Club Organizer Persona (Sec 3.2)',
    reactionIcon: '🌈',
    reactionCount: 5,
    avatarBg: '#42D2ED',
    options: ['Combine What + When + History', 'Prevent Loud-Voice Bias', 'Show Per-Member Fairness'],
    defaultAnswer: 'Plain schedulers only ask WHEN members are free, not WHAT event format they prefer, and they never learn from historical attendance or protect quiet members via Least-Misery / Fairness-Aware aggregation.',
  },
  {
    id: 'OQ-3',
    question: 'How do you handle the small real-world club dataset risk?',
    userRole: 'Evaluator / Instructor Persona (Sec 17.2)',
    reactionIcon: '💎',
    reactionCount: 4,
    avatarBg: '#D0075A',
    options: ['Seeded Synthetic Generator (FR-016)', 'Controllable Conflict Regimes', 'Explicit Synthetic Labeling'],
    defaultAnswer: 'FR-016 fits distributions to real survey CSVs from 2–3 campus clubs and generates seeded synthetic clubs spanning Homogeneous, Mixed, and Conflicting preference regimes—always explicitly flagged with is_synthetic=1.',
  },
  {
    id: 'OQ-4',
    question: 'What is the Evaluation Caveat in Section 12.3?',
    userRole: 'Academic Reviewer (Sec 12.3 & 15)',
    reactionIcon: '🎯',
    reactionCount: 6,
    avatarBg: '#3BCF81',
    options: ['Historical Organizer Bias', 'Temporal Split + Simulation', 'Multi-Metric Reporting'],
    defaultAnswer: 'Logged past events reflect historical organizer intuition rather than optimal choices. Therefore, Hit@3 measures agreement with history, while our seeded simulation measures true minimum-member satisfaction and Gini inequality.',
  },
];
