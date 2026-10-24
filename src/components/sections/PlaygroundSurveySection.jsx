import React, { useState } from 'react';
import { EVENT_TYPES, FAQ_ITEMS } from '../../config/siteConfig.js';
import { PixelDisplayHeading } from '../ui/PixelDisplayHeading.jsx';
import { SelectionBox } from '../ui/SelectionBox.jsx';

export function PlaygroundSurveySection({
  organizerAvatar,
  onAddSurveyMember,
  surveyModalOpen,
  onCloseSurveyModal,
}) {
  // FR-001 Dry-Run Member Survey State (Under 3 minutes completion target, US-4)
  const [ratings, setRatings] = useState({
    workshop: 5,
    talk: 4,
    hackathon: 3,
    quiz: 4,
    social: 5,
  });
  const [selectedSlots, setSelectedSlots] = useState([
    'Wed-afternoon',
    'Thu-evening',
    'Fri-evening',
    'Sat-afternoon',
  ]);
  const [currentChoosingMethod, setCurrentChoosingMethod] = useState('WhatsApp / Discord Poll');
  const [attendanceDisappointment, setAttendanceDisappointment] = useState('Often (Exam & class clashes)');
  const [consentChecked, setConsentChecked] = useState(true);
  const [submittedNotice, setSubmittedNotice] = useState('');

  // Section 17.3 Open Questions Interactive Reactions & Selected Answers
  const [questionStates, setQuestionStates] = useState(() => {
    const init = {};
    FAQ_ITEMS.forEach((q) => {
      init[q.id] = {
        count: q.reactionCount,
        reacted: false,
        selectedOption: q.options[0],
      };
    });
    return init;
  });

  const toggleSlot = (slotKey) => {
    setSelectedSlots((prev) =>
      prev.includes(slotKey) ? prev.filter((s) => s !== slotKey) : [...prev, slotKey]
    );
  };

  const handleRatingChange = (typeId, val) => {
    setRatings((prev) => ({ ...prev, [typeId]: val }));
  };

  const handleSurveySubmit = (e) => {
    e.preventDefault();
    if (!consentChecked) return;

    const availabilityMap = {};
    selectedSlots.forEach((s) => {
      availabilityMap[s] = 1;
    });

    const newMember = {
      member_id: `M-${Math.floor(11 + Math.random() * 88)}`,
      personaTag: 'Live Survey Respondent',
      historyWeight: 1.15,
      pastEventsAttended: 3,
      ratings: { ...ratings },
      availability: availabilityMap,
    };

    onAddSurveyMember(newMember);
    setSubmittedNotice(
      `✓ Added anonymized member ${newMember.member_id} (Zero PII stored) to active club & re-ranked Demo Lab!`
    );
    setTimeout(() => setSubmittedNotice(''), 5000);
  };

  const toggleReaction = (qId) => {
    setQuestionStates((prev) => {
      const curr = prev[qId];
      return {
        ...prev,
        [qId]: {
          ...curr,
          reacted: !curr.reacted,
          count: curr.reacted ? curr.count - 1 : curr.count + 1,
        },
      };
    });
  };

  const selectQuestionOption = (qId, opt) => {
    setQuestionStates((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        selectedOption: opt,
      },
    }));
  };

  const quickSlotOptions = [
    { key: 'Tue-evening', label: 'Tue Eve (18–20h)' },
    { key: 'Wed-afternoon', label: 'Wed Aft (15–17h)' },
    { key: 'Thu-evening', label: 'Thu Eve (18–20h)' },
    { key: 'Fri-evening', label: 'Fri Eve (18–20h)' },
    { key: 'Sat-morning', label: 'Sat Morn (09–11h)' },
    { key: 'Sat-afternoon', label: 'Sat Aft (15–17h)' },
    { key: 'Sun-evening', label: 'Sun Eve (18–20h)' },
  ];

  return (
    <section
      id="playground"
      style={{
        position: 'relative',
        paddingTop: '48px',
        paddingBottom: '110px',
      }}
    >
      <div className="nudge-container">
        {/* Section Header: CORE CAPABILITIES / SURVEY & OPEN QUESTIONS */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <PixelDisplayHeading
            lines={['SURVEY &', 'OPEN Q&A']}
            as="h2"
            size="var(--text-display-section)"
            scrollFade={true}
          />
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '17px',
              color: '#333333',
              maxWidth: '620px',
              margin: '16px auto 0',
              lineHeight: 1.5,
            }}
          >
            Try the anonymized Member Preference &amp; Availability Survey dry-run, then read the answers to common questions.
          </p>
        </div>

        {/* 1. Interactive FR-001 Member Survey Form (Injects new anonymized member directly into Demo Lab) */}
        <div style={{ marginBottom: '84px' }}>
          <SelectionBox
            borderColor="#111111"
            handleFill="#42D2ED"
            handleStroke="#111111"
            handleSize="12px"
            style={{
              backgroundColor: '#FFFFFF',
              padding: '36px',
              boxShadow: surveyModalOpen ? '0 0 0 6px #42D2ED' : 'var(--shadow-card)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                borderBottom: '1px solid #E5E5E5',
                paddingBottom: '16px',
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: '#3BCF81',
                    padding: '4px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  MEMBER SURVEY DRY-RUN
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '28px',
                    fontWeight: 500,
                    marginTop: '8px',
                  }}
                >
                  Submit Anonymized Preferences &amp; Weekly Availability
                </h3>
              </div>

              {surveyModalOpen && (
                <button
                  type="button"
                  onClick={onCloseSurveyModal}
                  style={{
                    backgroundColor: '#111111',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✓ ACTIVE FOCUS
                </button>
              )}
            </div>

            <form onSubmit={handleSurveySubmit}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '32px',
                  marginBottom: '28px',
                }}
              >
                {/* Part 1: 1-5 Interest Ratings per Event Type */}
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginBottom: '12px',
                    }}
                  >
                    1. RATE EVENT TYPES (INTEGER 1–5):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {EVENT_TYPES.map((et) => (
                      <div
                        key={et.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          backgroundColor: '#F8F8F8',
                          border: '1px solid #E5E5E5',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 500 }}>
                          {et.icon} {et.label}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleRatingChange(et.id, num)}
                              style={{
                                width: '30px',
                                height: '30px',
                                border: '1px solid #111111',
                                backgroundColor: ratings[et.id] === num ? '#111111' : '#FFFFFF',
                                color: ratings[et.id] === num ? '#FFFFFF' : '#111111',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Part 2: Weekly Slot Selection + Section 3.3 Validation Questions */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginBottom: '12px',
                      }}
                    >
                      2. SELECT YOUR FREE SLOTS (BINARY 0/1):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {quickSlotOptions.map((s) => {
                        const active = selectedSlots.includes(s.key);
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => toggleSlot(s.key)}
                            style={{
                              padding: '10px 14px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1.5px solid #111111',
                              backgroundColor: active ? '#42D2ED' : '#FFFFFF',
                              color: '#111111',
                              cursor: 'pointer',
                            }}
                          >
                            {active ? '✓ ' : '+ '}
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 3.3 Evidence Validation Questions */}
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: '#FFF9E6',
                      border: '1px solid #E5B433',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', fontWeight: 700, marginBottom: '10px' }}>
                      3. SECTION 3.3 PROBLEM VALIDATION QUESTIONS (FOR FINAL REPORT):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                          How does your club pick events now?
                        </label>
                        <select
                          value={currentChoosingMethod}
                          onChange={(e) => setCurrentChoosingMethod(e.target.value)}
                          style={{ width: '100%', padding: '7px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}
                        >
                          <option>WhatsApp / Discord Poll</option>
                          <option>Core Team Intuition</option>
                          <option>Doodle Availability Poll</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                          How often does turnout disappoint?
                        </label>
                        <select
                          value={attendanceDisappointment}
                          onChange={(e) => setAttendanceDisappointment(e.target.value)}
                          style={{ width: '100%', padding: '7px', fontFamily: 'var(--font-mono)', fontSize: '11.5px' }}
                        >
                          <option>Often (Exam &amp; class clashes)</option>
                          <option>Sometimes (Loud-member bias)</option>
                          <option>Rarely</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Consent & Submit Button (Section 11.3) */}
                  <div>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13.5px',
                        marginBottom: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                      />
                      <span>
                        <strong>Consent:</strong> I consent to anonymous aggregation. No name, email, or roll number is collected.
                      </span>
                    </label>

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '15px 24px',
                        backgroundColor: '#111111',
                        color: '#FFFFFF',
                        border: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                      }}
                    >
                      + APPEND ANONYMIZED MEMBER TO ACTIVE CLUB &amp; RE-RANK
                    </button>

                    {submittedNotice && (
                      <div
                        role="status"
                        style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          backgroundColor: '#A6E3C4',
                          border: '1.5px solid #111111',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        {submittedNotice}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </SelectionBox>
        </div>

        {/* 2. Chat-Style FAQ / Open Questions Cards (Matching Services FAQ Thread Cards in frame_066) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '32px',
          }}
        >
          {FAQ_ITEMS.map((item) => {
            const st = questionStates[item.id];
            return (
              <article
                key={item.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-card)',
                  border: '1px solid #ECECEC',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '14px',
                    color: '#888888',
                    borderBottom: '1px solid #EEEEEE',
                    paddingBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Question</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>FAQ</span>
                </div>

                {/* User Question Row */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    aria-hidden="true"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: item.avatarBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: item.avatarBg === '#D0075A' ? '#FFFFFF' : '#111111',
                      flexShrink: 0,
                    }}
                  >
                    ●
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#888888', marginBottom: '4px' }}>
                      {item.userRole}
                    </div>
                    <h4
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '22px',
                        fontWeight: 500,
                        lineHeight: 1.25,
                        letterSpacing: '-0.015em',
                        color: '#111111',
                        marginBottom: '12px',
                      }}
                    >
                      {item.question}
                    </h4>

                    {/* Interactive Reaction Counter Pill (frame_066) */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleReaction(item.id)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          backgroundColor: st.reacted ? '#E6F9FD' : '#FFFDF5',
                          border: `1.5px solid ${item.avatarBg}`,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {item.reactionIcon} {st.count}
                      </button>

                      {item.options.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => selectQuestionOption(item.id, opt)}
                          style={{
                            padding: '4px 9px',
                            borderRadius: '4px',
                            border: '1px solid #DDDDDD',
                            backgroundColor: st.selectedOption === opt ? '#111111' : '#FFFFFF',
                            color: st.selectedOption === opt ? '#FFFFFF' : '#444444',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10.5px',
                            cursor: 'pointer',
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reply Bubble Row (frame_066: avatar + #F1F1F1 rounded reply box) */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginTop: '4px' }}>
                  <img
                    src={organizerAvatar}
                    alt="Quorum project lead avatar"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div
                    style={{
                      backgroundColor: 'var(--color-bg-chat-bubble)',
                      borderRadius: '14px',
                      padding: '16px 18px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '15px',
                      lineHeight: 1.5,
                      color: '#222222',
                      flex: 1,
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#555555', marginBottom: '4px' }}>
                      DECISION FOCUS: {st.selectedOption.toUpperCase()}
                    </div>
                    {item.defaultAnswer}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
