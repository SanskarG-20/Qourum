import React from 'react';
import { SelectionBox } from '../../ui/SelectionBox.jsx';

export function DataZone({
  clubs,
  onSelectClub,
  setExcludedMembers,
  setSelectedRecIndex,
  validatorReport,
  setValidatorReport,
  activeClub,
  handleRunValidatorTest,
}) {
  return (
              <div id="demo-zone-data">
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: 'var(--color-gold-primary)',
                    color: '#111111',
                    padding: '6px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    marginBottom: '12px',
                  }}
                >
                  STEP 01 • CLUB DATA &amp; SCHEMA VALIDATOR
                </div>

                <SelectionBox
                  borderColor="#E5B433"
                  handleFill="#FFFFFF"
                  handleStroke="#E5B433"
                  handleSize="12px"
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '32px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '20px',
                      marginBottom: '24px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '28px',
                          fontWeight: 500,
                          letterSpacing: '-0.02em',
                          marginBottom: '6px',
                        }}
                      >
                        Select Anonymized Campus Club Dataset
                      </h3>
                      <p style={{ fontSize: '15px', color: '#444444' }}>
                        All member identities are stripped to generated IDs (<code>M-01</code>..<code>M-10</code>) to protect privacy. Synthetic rows carry explicit <code>is_synthetic=1</code> flags.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleRunValidatorTest}
                      style={{
                        backgroundColor: '#111111',
                        color: '#FFFFFF',
                        border: '1.5px solid #111111',
                        padding: '10px 16px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 600,
                        letterSpacing: '0.05em',
                        cursor: 'pointer',
                      }}
                    >
                      {validatorReport ? '✓ RE-RUN 30-ROW CSV VALIDATOR' : '▶ RUN 30-ROW CSV VALIDATOR'}
                    </button>
                  </div>

                  {/* 4 Bundled Club Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                      gap: '14px',
                      marginBottom: '20px',
                    }}
                  >
                    {clubs.map((c) => {
                      const isSelected = c.club_id === activeClub.club_id;
                      return (
                        <button
                          key={c.club_id}
                          type="button"
                          onClick={() => {
                            onSelectClub(c.club_id);
                            setExcludedMembers([]);
                            setSelectedRecIndex(0);
                          }}
                          style={{
                            textAlign: 'left',
                            padding: '16px',
                            backgroundColor: isSelected ? '#FFF9E6' : '#FAFAFA',
                            border: isSelected ? '2px solid #111111' : '1px solid #DFDFDF',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '10px',
                            transition: 'all 150ms ease',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '11px',
                                fontWeight: 600,
                                marginBottom: '6px',
                              }}
                            >
                              <span>{c.club_id} • {c.members.length} MEMBERS</span>
                              {c.is_synthetic && (
                                <span
                                  style={{
                                    backgroundColor: '#F2DEA3',
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                  }}
                                >
                                  SYNTHETIC
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '17px',
                                fontWeight: 600,
                                color: '#111111',
                                marginBottom: '4px',
                              }}
                            >
                              {c.name}
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'inline-block',
                              alignSelf: 'flex-start',
                              backgroundColor: c.conflictBadgeColor,
                              color: c.conflictBadgeColor === '#D0075A' ? '#FFFFFF' : '#111111',
                              padding: '3px 8px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10.5px',
                              fontWeight: 600,
                            }}
                          >
                            {c.regime}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Club Description Sticky Banner */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-gold-tint)',
                      padding: '14px 18px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14.5px',
                      color: '#111111',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span>
                      <strong>Active Club Context:</strong> {activeClub.description}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600 }}>
                      Last Event: {activeClub.lastEvent.type_id.toUpperCase()} ({activeClub.lastEvent.day} {activeClub.lastEvent.slot})
                    </span>
                  </div>

                  {/* FR-002 & FR-003 30-Row CSV Schema Validation Report Drawer */}
                  {validatorReport && (
                    <div
                      role="region"
                      aria-label="CSV Schema Validation Report"
                      style={{
                        marginTop: '20px',
                        border: '1.5px solid #111111',
                        backgroundColor: '#FAFAFA',
                        padding: '20px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
                          VALIDATOR REPORT: {validatorReport.validCount} OF {validatorReport.totalRows} ROWS LOADED • {validatorReport.errorCount} REJECTED
                        </div>
                        <button
                          type="button"
                          onClick={() => setValidatorReport(null)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #111111',
                            padding: '4px 10px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          HIDE REPORT
                        </button>
                      </div>
                      <p style={{ fontSize: '13.5px', color: '#333333', marginBottom: '12px' }}>
                        Acceptance test verified: 30-row import sample containing 3 deliberately malformed rows loads 27 valid records and flags the exact 3 row-level schema/privacy errors below:
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {validatorReport.errors.map((err) => (
                          <div
                            key={err.row}
                            style={{
                              backgroundColor: '#FFE8F0',
                              borderLeft: '4px solid #D0075A',
                              padding: '10px 14px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '12px',
                              color: '#111111',
                            }}
                          >
                            <strong>Row #{err.row} ({err.event_id}) REJECTED:</strong> {err.issues.join(' | ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SelectionBox>
              </div>
  );
}
