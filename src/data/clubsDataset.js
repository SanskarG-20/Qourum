// Bundled Anonymized Club Datasets & 30-Row CSV Validation Sample (prd.md Section 7 & 11)

export const SAMPLE_CLUBS = [
  {
    club_id: 'CLUB-01',
    name: 'ACM & Robotics Guild',
    regime: 'Conflicting Preferences (Polarized)',
    conflictBadgeColor: '#D0075A',
    is_synthetic: false,
    description: '10 anonymized members split between hardcore builders who love Friday evening Hackathons/Workshops and theory/seminar fans who prefer Wednesday afternoon Talks & Quizzes. Classic case where Average and Least-Misery disagree!',
    lastEvent: { type_id: 'workshop', day: 'Fri', slot: 'evening', date: '2026-09-18', attendanceCount: 7 },
    members: [
      {
        member_id: 'M-01',
        personaTag: 'Hardware Lead',
        historyWeight: 1.0,
        pastEventsAttended: 6,
        ratings: { workshop: 5, hackathon: 5, talk: 2, quiz: 3, social: 2 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 0, 'Tue-evening': 1, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-02',
        personaTag: 'ML Researcher',
        historyWeight: 0.95,
        pastEventsAttended: 5,
        ratings: { workshop: 5, hackathon: 4, talk: 4, quiz: 4, social: 2 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 0, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-03',
        personaTag: 'Embedded Builder',
        historyWeight: 1.0,
        pastEventsAttended: 6,
        ratings: { workshop: 5, hackathon: 5, talk: 1, quiz: 2, social: 3 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 0, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 1, 'Sun-evening': 0
        },
      },
      {
        member_id: 'M-04',
        personaTag: 'Systems Hacker',
        historyWeight: 0.9,
        pastEventsAttended: 5,
        ratings: { workshop: 5, hackathon: 5, talk: 2, quiz: 3, social: 2 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 0, 'Tue-evening': 1, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-05',
        personaTag: 'Robotics Sophomore',
        historyWeight: 1.05,
        pastEventsAttended: 4,
        ratings: { workshop: 4, hackathon: 5, talk: 3, quiz: 4, social: 3 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 0, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-06',
        personaTag: 'Seminar Enthusiast',
        historyWeight: 1.35, // Historically underserved by builder-heavy events
        pastEventsAttended: 2,
        ratings: { workshop: 3, hackathon: 1, talk: 5, quiz: 5, social: 4 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 1, 'Sun-evening': 0
        },
      },
      {
        member_id: 'M-07',
        personaTag: 'Quiz & Theory Buff',
        historyWeight: 1.4, // Historically underserved
        pastEventsAttended: 2,
        ratings: { workshop: 3, hackathon: 1, talk: 5, quiz: 5, social: 4 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 1, 'Sat-morning': 0, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 1, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-08',
        personaTag: 'Community Coordinator',
        historyWeight: 1.25,
        pastEventsAttended: 3,
        ratings: { workshop: 4, hackathon: 2, talk: 4, quiz: 4, social: 5 },
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 0, 'Sat-morning': 1, 'Sat-afternoon': 0, 'Thu-evening': 0, 'Tue-evening': 1, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-09',
        personaTag: 'Interdisciplinary Member',
        historyWeight: 1.15,
        pastEventsAttended: 3,
        ratings: { workshop: 4, hackathon: 3, talk: 4, quiz: 4, social: 4 },
        availability: {
          'Wed-afternoon': 0, 'Fri-evening': 1, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 1, 'Sun-evening': 1
        },
      },
      {
        member_id: 'M-10',
        personaTag: 'First-Year Newcomer (Cold Start)',
        historyWeight: 1.2,
        pastEventsAttended: 0,
        isColdStart: true,
        ratings: {}, // 0 ratings -> triggers FR-015 Cold Start fallback to club average!
        availability: {
          'Wed-afternoon': 1, 'Fri-evening': 0, 'Sat-morning': 1, 'Sat-afternoon': 1, 'Thu-evening': 1, 'Tue-evening': 0, 'Sun-evening': 1
        },
      },
    ],
  },
  {
    club_id: 'CLUB-02',
    name: 'UI/UX & Product Design Collective',
    regime: 'Homogeneous Preferences (High Consensus)',
    conflictBadgeColor: '#3BCF81',
    is_synthetic: false,
    description: '8 anonymized members who strongly agree on Hands-On Figma/Prototyping Workshops and Speaker Talks on Thursday evenings and Saturday afternoons.',
    lastEvent: { type_id: 'talk', day: 'Thu', slot: 'evening', date: '2026-09-24', attendanceCount: 7 },
    members: [
      { member_id: 'M-01', personaTag: 'Design Lead', historyWeight: 1.0, pastEventsAttended: 5, ratings: { workshop: 5, talk: 5, social: 4, hackathon: 3, quiz: 2 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 1, 'Fri-evening': 1 } },
      { member_id: 'M-02', personaTag: 'UX Researcher', historyWeight: 1.0, pastEventsAttended: 5, ratings: { workshop: 5, talk: 4, social: 4, hackathon: 3, quiz: 3 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 1, 'Fri-evening': 0 } },
      { member_id: 'M-03', personaTag: 'Visual Designer', historyWeight: 1.05, pastEventsAttended: 4, ratings: { workshop: 5, talk: 5, social: 5, hackathon: 4, quiz: 2 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 0, 'Fri-evening': 1 } },
      { member_id: 'M-04', personaTag: 'Motion Crafter', historyWeight: 1.0, pastEventsAttended: 4, ratings: { workshop: 5, talk: 4, social: 4, hackathon: 3, quiz: 2 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 1, 'Fri-evening': 1 } },
      { member_id: 'M-05', personaTag: 'Design Systems', historyWeight: 1.0, pastEventsAttended: 5, ratings: { workshop: 4, talk: 5, social: 3, hackathon: 4, quiz: 3 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 1, 'Fri-evening': 1 } },
      { member_id: 'M-06', personaTag: 'Frontend Prototyper', historyWeight: 1.1, pastEventsAttended: 3, ratings: { workshop: 5, talk: 4, social: 4, hackathon: 4, quiz: 3 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 1, 'Fri-evening': 0 } },
      { member_id: 'M-07', personaTag: 'Brand Strategist', historyWeight: 1.05, pastEventsAttended: 4, ratings: { workshop: 4, talk: 5, social: 5, hackathon: 3, quiz: 3 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 0, 'Wed-afternoon': 1, 'Fri-evening': 1 } },
      { member_id: 'M-08', personaTag: 'Freshman Member', historyWeight: 1.15, pastEventsAttended: 2, ratings: { workshop: 5, talk: 4, social: 4, hackathon: 3, quiz: 3 }, availability: { 'Thu-evening': 1, 'Sat-afternoon': 1, 'Wed-afternoon': 1, 'Fri-evening': 1 } },
    ],
  },
  {
    club_id: 'CLUB-03',
    name: ' Parliamentary Debate & Quiz Society',
    regime: 'Mixed Preferences + Tight Exam Schedule [Synthetic]',
    conflictBadgeColor: '#E5B433',
    is_synthetic: true,
    description: '9 synthetic members (is_synthetic=1) generated with seed=42 during midterm exam week where availability is fragmented across slots.',
    lastEvent: { type_id: 'quiz', day: 'Tue', slot: 'evening', date: '2026-10-06', attendanceCount: 6 },
    members: [
      { member_id: 'M-01', personaTag: 'Debate Captain', historyWeight: 1.0, pastEventsAttended: 6, ratings: { quiz: 5, talk: 5, social: 3, workshop: 3, hackathon: 1 }, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 0 } },
      { member_id: 'M-02', personaTag: 'Adjudicator', historyWeight: 1.05, pastEventsAttended: 5, ratings: { quiz: 5, talk: 4, social: 4, workshop: 3, hackathon: 1 }, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 1 } },
      { member_id: 'M-03', personaTag: 'Trivia Lead', historyWeight: 0.95, pastEventsAttended: 5, ratings: { quiz: 5, talk: 3, social: 5, workshop: 2, hackathon: 2 }, availability: { 'Tue-evening': 1, 'Sat-morning': 0, 'Sun-evening': 1, 'Fri-evening': 1 } },
      { member_id: 'M-04', personaTag: 'Policy Analyst', historyWeight: 1.2, pastEventsAttended: 3, ratings: { quiz: 3, talk: 5, social: 2, workshop: 4, hackathon: 2 }, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 0 } },
      { member_id: 'M-05', personaTag: 'Novice Speaker', historyWeight: 1.35, pastEventsAttended: 2, ratings: { quiz: 3, talk: 4, social: 4, workshop: 5, hackathon: 2 }, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 1 } },
      { member_id: 'M-06', personaTag: 'Social Sec', historyWeight: 1.3, pastEventsAttended: 2, ratings: { quiz: 4, talk: 2, social: 5, workshop: 3, hackathon: 1 }, availability: { 'Tue-evening': 0, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 1 } },
      { member_id: 'M-07', personaTag: 'Workshop Coord', historyWeight: 1.25, pastEventsAttended: 3, ratings: { quiz: 3, talk: 4, social: 3, workshop: 5, hackathon: 3 }, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 0, 'Fri-evening': 1 } },
      { member_id: 'M-08', personaTag: 'IR Major', historyWeight: 1.1, pastEventsAttended: 4, ratings: { quiz: 4, talk: 5, social: 3, workshop: 4, hackathon: 1 }, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 0 } },
      { member_id: 'M-09', personaTag: 'New Member (Cold Start)', historyWeight: 1.2, pastEventsAttended: 0, isColdStart: true, ratings: {}, availability: { 'Tue-evening': 1, 'Sat-morning': 1, 'Sun-evening': 1, 'Fri-evening': 1 } },
    ],
  },
  {
    club_id: 'CLUB-04',
    name: 'Quantum Hardware Reading Group (<5 Members)',
    regime: 'Small Club Boundary Case (Sec 8 Warning)',
    conflictBadgeColor: '#42D2ED',
    is_synthetic: true,
    description: '4-member mini-group designed to test the Section 8 boundary condition: clubs with fewer than 5 members trigger an explicit Low-Confidence Warning badge.',
    lastEvent: { type_id: 'talk', day: 'Wed', slot: 'afternoon', date: '2026-10-01', attendanceCount: 3 },
    members: [
      { member_id: 'M-01', personaTag: 'Physics Grad', historyWeight: 1.0, pastEventsAttended: 3, ratings: { talk: 5, workshop: 5, quiz: 3, hackathon: 4, social: 2 }, availability: { 'Wed-afternoon': 1, 'Fri-evening': 1 } },
      { member_id: 'M-02', personaTag: 'CS Senior', historyWeight: 1.1, pastEventsAttended: 2, ratings: { talk: 4, workshop: 5, quiz: 4, hackathon: 5, social: 3 }, availability: { 'Wed-afternoon': 1, 'Fri-evening': 1 } },
      { member_id: 'M-03', personaTag: 'EE Junior', historyWeight: 1.2, pastEventsAttended: 2, ratings: { talk: 5, workshop: 4, quiz: 3, hackathon: 3, social: 3 }, availability: { 'Wed-afternoon': 1, 'Fri-evening': 0 } },
      { member_id: 'M-04', personaTag: 'Math Sophomore', historyWeight: 1.15, pastEventsAttended: 2, ratings: { talk: 5, workshop: 4, quiz: 5, hackathon: 2, social: 2 }, availability: { 'Wed-afternoon': 1, 'Fri-evening': 1 } },
    ],
  },
];

// FR-002 & FR-003 Acceptance Test Sample: 30 rows with 3 deliberately invalid rows
export const CSV_VALIDATION_TEST_SAMPLE = [
  { row: 1, event_id: 'EV-101', club_id: 'CLUB-01', type_id: 'workshop', date: '2026-08-14', slot: 'evening', attendance_count: 8, member_id: 'M-01', rating: 5 },
  { row: 2, event_id: 'EV-102', club_id: 'CLUB-01', type_id: 'talk', date: '2026-08-21', slot: 'afternoon', attendance_count: 7, member_id: 'M-02', rating: 4 },
  { row: 3, event_id: 'EV-103', club_id: 'CLUB-01', type_id: 'hackathon', date: '2026-08-28', slot: 'evening', attendance_count: 9, member_id: 'M-03', rating: 5 },
  { row: 4, event_id: 'EV-104', club_id: 'CLUB-01', type_id: 'quiz', date: '2026-09-04', slot: 'afternoon', attendance_count: 6, member_id: 'M-04', rating: 3 },
  { row: 5, event_id: 'EV-105', club_id: 'CLUB-01', type_id: 'social', date: '2026-09-11', slot: 'evening', attendance_count: 8, member_id: 'M-05', rating: 4 },
  // DELIBERATELY BAD ROW #1: Rating out of range (7 instead of 1..5)
  { row: 6, event_id: 'EV-106', club_id: 'CLUB-01', type_id: 'workshop', date: '2026-09-12', slot: 'evening', attendance_count: 7, member_id: 'M-06', rating: 7 },
  { row: 7, event_id: 'EV-107', club_id: 'CLUB-01', type_id: 'workshop', date: '2026-09-18', slot: 'evening', attendance_count: 9, member_id: 'M-07', rating: 3 },
  { row: 8, event_id: 'EV-108', club_id: 'CLUB-01', type_id: 'talk', date: '2026-09-25', slot: 'afternoon', attendance_count: 7, member_id: 'M-08', rating: 5 },
  { row: 9, event_id: 'EV-109', club_id: 'CLUB-01', type_id: 'hackathon', date: '2026-10-02', slot: 'evening', attendance_count: 8, member_id: 'M-09', rating: 4 },
  { row: 10, event_id: 'EV-110', club_id: 'CLUB-02', type_id: 'workshop', date: '2026-08-15', slot: 'afternoon', attendance_count: 7, member_id: 'M-01', rating: 5 },
  { row: 11, event_id: 'EV-111', club_id: 'CLUB-02', type_id: 'talk', date: '2026-08-22', slot: 'evening', attendance_count: 8, member_id: 'M-02', rating: 5 },
  { row: 12, event_id: 'EV-112', club_id: 'CLUB-02', type_id: 'social', date: '2026-08-29', slot: 'evening', attendance_count: 6, member_id: 'M-03', rating: 4 },
  // DELIBERATELY BAD ROW #2: Attendance count (19) exceeds club size (10) & invalid ISO date
  { row: 13, event_id: 'EV-113', club_id: 'CLUB-01', type_id: 'quiz', date: '2026-13-45', slot: 'evening', attendance_count: 19, member_id: 'M-04', rating: 4 },
  { row: 14, event_id: 'EV-114', club_id: 'CLUB-02', type_id: 'workshop', date: '2026-09-05', slot: 'afternoon', attendance_count: 8, member_id: 'M-04', rating: 5 },
  { row: 15, event_id: 'EV-115', club_id: 'CLUB-02', type_id: 'talk', date: '2026-09-12', slot: 'evening', attendance_count: 7, member_id: 'M-05', rating: 5 },
  { row: 16, event_id: 'EV-116', club_id: 'CLUB-02', type_id: 'hackathon', date: '2026-09-19', slot: 'afternoon', attendance_count: 6, member_id: 'M-06', rating: 4 },
  { row: 17, event_id: 'EV-117', club_id: 'CLUB-02', type_id: 'social', date: '2026-09-26', slot: 'evening', attendance_count: 7, member_id: 'M-07', rating: 5 },
  { row: 18, event_id: 'EV-118', club_id: 'CLUB-03', type_id: 'quiz', date: '2026-08-18', slot: 'evening', attendance_count: 8, member_id: 'M-01', rating: 5 },
  { row: 19, event_id: 'EV-119', club_id: 'CLUB-03', type_id: 'talk', date: '2026-08-25', slot: 'evening', attendance_count: 7, member_id: 'M-02', rating: 4 },
  { row: 20, event_id: 'EV-120', club_id: 'CLUB-03', type_id: 'workshop', date: '2026-09-01', slot: 'morning', attendance_count: 6, member_id: 'M-03', rating: 3 },
  { row: 21, event_id: 'EV-121', club_id: 'CLUB-03', type_id: 'social', date: '2026-09-08', slot: 'evening', attendance_count: 8, member_id: 'M-04', rating: 4 },
  // DELIBERATELY BAD ROW #3: Unresolved foreign key member_id ('M-999') & PII email detected
  { row: 22, event_id: 'EV-122', club_id: 'CLUB-03', type_id: 'quiz', date: '2026-09-15', slot: 'evening', attendance_count: 7, member_id: 'student@college.edu (M-999)', rating: 5 },
  { row: 23, event_id: 'EV-123', club_id: 'CLUB-03', type_id: 'talk', date: '2026-09-22', slot: 'evening', attendance_count: 8, member_id: 'M-05', rating: 4 },
  { row: 24, event_id: 'EV-124', club_id: 'CLUB-03', type_id: 'workshop', date: '2026-09-29', slot: 'morning', attendance_count: 7, member_id: 'M-06', rating: 4 },
  { row: 25, event_id: 'EV-125', club_id: 'CLUB-03', type_id: 'quiz', date: '2026-10-06', slot: 'evening', attendance_count: 6, member_id: 'M-07', rating: 5 },
  { row: 26, event_id: 'EV-126', club_id: 'CLUB-01', type_id: 'workshop', date: '2026-10-09', slot: 'evening', attendance_count: 8, member_id: 'M-01', rating: 5 },
  { row: 27, event_id: 'EV-127', club_id: 'CLUB-01', type_id: 'talk', date: '2026-10-11', slot: 'afternoon', attendance_count: 8, member_id: 'M-06', rating: 5 },
  { row: 28, event_id: 'EV-128', club_id: 'CLUB-02', type_id: 'workshop', date: '2026-10-12', slot: 'evening', attendance_count: 7, member_id: 'M-01', rating: 5 },
  { row: 29, event_id: 'EV-129', club_id: 'CLUB-02', type_id: 'talk', date: '2026-10-14', slot: 'evening', attendance_count: 7, member_id: 'M-03', rating: 4 },
  { row: 30, event_id: 'EV-130', club_id: 'CLUB-03', type_id: 'quiz', date: '2026-10-15', slot: 'evening', attendance_count: 8, member_id: 'M-08', rating: 4 },
];
