// Configuration constants for the Quorum landing-page demo

export const PRODUCT_TITLE = {
  label: 'QUORUM',
  tag: 'Group-aware event picks',
  subtitle: 'Group-Aware Event Recommendation for College Clubs',
};

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
    code: 'MEAN',
    name: 'Average Aggregation',
    shortName: 'Average (Mean)',
    formula: 'S_group(e, s) = (1 / |A_s|) * Σ_{m ∈ A_s} p(m, e, s)',
    description: 'Maximizes overall utilitarian mean score across available members, but risks ignoring a dissatisfied minority in polarized clubs.',
    badgeColor: '#42D2ED',
  },
  {
    id: 'least_misery',
    code: 'MIN',
    name: 'Least-Misery Aggregation',
    shortName: 'Least Misery (Min)',
    formula: 'S_group(e, s) = min_{m ∈ A_s} p(m, e, s)',
    description: 'Maximizes the lowest individual member satisfaction score among available members so no attendee feels excluded.',
    badgeColor: '#E5B433',
  },
  {
    id: 'fairness_aware',
    code: 'WEIGHTED',
    name: 'Fairness-Aware Aggregation',
    shortName: 'Fairness-Aware',
    formula: 'S_group(e, s) = Σ w_m · p(m, e, s) − λ · Var({p(m, e, s)})',
    description: 'Weights members inversely by historical satisfaction in prior rounds and penalizes intra-group variance (λ = 0.38).',
    badgeColor: '#D0075A',
  },
];

export const PREFERENCE_MODELS = [
  { id: 'hybrid_mf', label: 'Hybrid MF + Item-Mean (Main)', isBaseline: false },
  { id: 'item_mean', label: 'Content / Item-Mean', isBaseline: false },
  { id: 'popularity', label: 'Most-Popular Baseline', isBaseline: true },
  { id: 'repeat_last', label: 'Repeat-Last-Event Baseline', isBaseline: true },
  { id: 'random', label: 'Seeded Random Baseline', isBaseline: true },
];

export const FAQ_ITEMS = [
  {
    id: 'FAQ-1',
    question: 'Why not just use a Doodle poll or WhatsApp vote?',
    userRole: 'Club organizer',
    reactionIcon: '🌈',
    reactionCount: 5,
    avatarBg: '#42D2ED',
    options: ['Combine What + When + History', 'Prevent Loud-Voice Bias', 'Show Per-Member Fairness'],
    defaultAnswer: 'Plain schedulers only ask WHEN members are free, not WHAT event format they prefer, and they never learn from historical attendance or protect quiet members via Least-Misery / Fairness-Aware aggregation.',
  },
  {
    id: 'FAQ-2',
    question: 'How do you handle the small real-world club dataset risk?',
    userRole: 'Evaluator / instructor',
    reactionIcon: '💎',
    reactionCount: 4,
    avatarBg: '#D0075A',
    options: ['Seeded Synthetic Generator', 'Controllable Conflict Regimes', 'Explicit Synthetic Labeling'],
    defaultAnswer: 'A seeded synthetic generator produces clubs spanning Homogeneous, Mixed, and Conflicting preference regimes, always flagged with is_synthetic=1. No real member data is used, so results describe the method on synthetic behavior only.',
  },
  {
    id: 'FAQ-3',
    question: 'What is the evaluation caveat?',
    userRole: 'Academic reviewer',
    reactionIcon: '🎯',
    reactionCount: 6,
    avatarBg: '#3BCF81',
    options: ['Historical Organizer Bias', 'Temporal Split + Simulation', 'Multi-Metric Reporting'],
    defaultAnswer: 'Logged past events reflect organizer choices rather than optimal ones, and attendance cannot be observed for events that were never held. Ranking metrics and Brier score compare predictions with history; the satisfaction metrics are the model\'s own predicted scores, so they favor methods that agree with it. All data is synthetic.',
  },
];
