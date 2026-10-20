import React, { useState } from 'react';
import { NAV_ITEMS } from '../../config/siteConfig.js';
import { BrandArchLogo, NavTabIcon } from '../ui/GeometricIcons.jsx';

export function TopNavbar({ activeSection, onSelectSection, organizerAvatar, onOpenSurveyModal }) {
  const [activeTooltip, setActiveTooltip] = useState(null); // 'sc' | 'sd' | null
  const [copiedNote, setCopiedNote] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCopyCommand = (text, label) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      }
    } catch (e) {
      // Fallback safe ignore in sandbox
    }
    setCopiedNote(`COPIED: ${label}`);
    setTimeout(() => setCopiedNote(''), 2000);
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          height: 'var(--navbar-height)',
          backgroundColor: 'var(--color-bg-navbar)',
          borderBottom: '1px solid var(--color-border-ruler)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        {/* Left Brand Cell + Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              onSelectSection('home');
            }}
            aria-label="Quorum Home"
            style={{
              width: '84px',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #EBEBEB',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <BrandArchLogo />
          </a>

          <nav aria-label="Main Navigation" className="hide-mobile" style={{ display: 'flex', height: '100%' }}>
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  data-nav-section={item.id}
                  className={`nav-tab-link ${isActive ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectSection(item.id);
                  }}
                  style={{
                    height: '100%',
                    padding: '0 22px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: isActive ? 'var(--color-cyan-primary)' : 'transparent',
                    color: '#111111',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    transition: 'background-color 160ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="nav-tab-icon-wrap">
                    <NavTabIcon type={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* Right Utility Cluster (SC / SD circular pills + Avatar + Survey Form CTA) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingRight: '24px',
            position: 'relative',
          }}
        >
          <button
            type="button"
            aria-label="Inspect Anonymized CSV Schema (FR-004)"
            onMouseEnter={() => setActiveTooltip('sc')}
            onMouseLeave={() => setActiveTooltip((prev) => (prev === 'sc' ? null : prev))}
            onClick={() => {
              setActiveTooltip('sc');
              handleCopyCommand('member_id,type_id,rating,day,slot,available', 'CSV SCHEMA HEADER');
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: activeTooltip === 'sc' ? 'var(--color-cyan-primary)' : 'var(--color-bg-pill-neutral)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#111111',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 160ms ease',
            }}
          >
            SC
          </button>

          <button
            type="button"
            aria-label="Inspect Reproducible Seed (FR-018)"
            onMouseEnter={() => setActiveTooltip('sd')}
            onMouseLeave={() => setActiveTooltip((prev) => (prev === 'sd' ? null : prev))}
            onClick={() => {
              setActiveTooltip('sd');
              handleCopyCommand('python -m eval.run_harness --seed 42', 'EVAL COMMAND');
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: activeTooltip === 'sd' ? 'var(--color-cyan-primary)' : 'var(--color-bg-pill-neutral)',
              border: 'none',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              color: '#111111',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 160ms ease',
            }}
          >
            SD
          </button>

          <button
            type="button"
            onMouseEnter={() => setActiveTooltip('avatar')}
            onMouseLeave={() => setActiveTooltip((prev) => (prev === 'avatar' ? null : prev))}
            onClick={() => onSelectSection('problem')}
            title="Club Organizer Persona (Section 5)"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              border: '2px solid var(--color-cyan-primary)',
              padding: 0,
              overflow: 'hidden',
              cursor: 'pointer',
              background: '#EEEEEE',
              flexShrink: 0,
            }}
          >
            <img
              src={organizerAvatar}
              alt="Club organizer avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </button>

          <button
            type="button"
            onClick={onOpenSurveyModal}
            style={{
              height: '42px',
              padding: '0 18px',
              backgroundColor: '#FFFFFF',
              color: '#111111',
              border: '1.5px solid #111111',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'background-color 160ms ease, color 160ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#111111';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#111111';
            }}
          >
            <span aria-hidden="true">♥</span>
            <span>SURVEY FORM</span>
          </button>

          {(activeTooltip || copiedNote) && (
            <div
              role="status"
              className="navbar-tooltip-animate"
              style={{
                position: 'absolute',
                top: '64px',
                right: '24px',
                backgroundColor: 'var(--color-cyan-primary)',
                color: '#111111',
                padding: '12px 20px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap',
                zIndex: 120,
              }}
            >
              {copiedNote
                ? copiedNote
                : activeTooltip === 'avatar'
                ? 'DOWNLOAD RESUME • ORGANIZER SPEC'
                : activeTooltip === 'sc'
                ? 'FR-004: ZERO PII • ANONYMIZED MEMBER_ID SCHEMA'
                : 'FR-018: SEED=42 DETERMINISTIC HARNESS'}
            </div>
          )}
        </div>
      </header>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 150,
          display: 'none',
        }}
        className="mobile-menu-trigger-wrap"
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            backgroundColor: '#111111',
            color: '#FFFFFF',
            border: '2px solid var(--color-cyan-primary)',
            borderRadius: '999px',
            padding: '12px 28px',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
            cursor: 'pointer',
          }}
        >
          {mobileMenuOpen ? '✕ CLOSE MENU' : '☰ MENU'}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-label="Mobile Navigation Menu"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 17, 17, 0.94)',
            zIndex: 140,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
          }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                setMobileMenuOpen(false);
              }}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '16px 24px',
                backgroundColor: activeSection === item.id ? 'var(--color-cyan-primary)' : '#222222',
                color: activeSection === item.id ? '#111111' : '#FFFFFF',
                border: '1.5px solid #444444',
                fontFamily: 'var(--font-mono)',
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .nav-tab-link:not(.is-active):hover {
          background-color: rgba(66, 210, 237, 0.14) !important;
        }
        .nav-tab-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
          will-change: transform;
        }
        .nav-tab-link:not(.is-active):hover .nav-tab-icon-wrap {
          transform: scale(1.15) rotate(8deg);
        }
        @keyframes navbarTooltipIn {
          0% {
            opacity: 0;
            transform: translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .navbar-tooltip-animate {
          animation: navbarTooltipIn 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @media (max-width: 809px) {
          .mobile-menu-trigger-wrap {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
