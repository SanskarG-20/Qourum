import React from 'react';

// Brand Rainbow Arch Icon (Top-left Navbar cell in design.md)
export function BrandArchLogo() {
  return (
    <svg width="36" height="22" viewBox="0 0 36 22" fill="none" aria-hidden="true">
      <path d="M2 20C2 11.1634 9.16344 4 18 4C26.8366 4 34 11.1634 34 20" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
      <path d="M7.5 20C7.5 14.201 12.201 9.5 18 9.5C23.799 9.5 28.5 14.201 28.5 20" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
      <path d="M13 20C13 17.2386 15.2386 15 18 15C20.7614 15 23 17.2386 23 20" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 6 Navigation Tab Geometric Icons (design.md Section E.1)
export function NavTabIcon({ type }) {
  switch (type) {
    case 'home':
      return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5L1.5 7V14.5H6V10H10V14.5H14.5V7L8 1.5Z" fill="#111111" />
        </svg>
      );
    case 'asterisk':
      return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1V15M1 8H15M3 3L13 13M13 3L3 13" stroke="#111111" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'spool':
      return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 2H14L11 8L14 14H2L5 8L2 2Z" fill="#111111" />
        </svg>
      );
    case 'stack':
      return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2.5" width="12" height="5" rx="2.5" fill="#111111" />
          <rect x="2" y="8.5" width="12" height="5" rx="2.5" fill="#111111" />
        </svg>
      );
    case 'branch':
      return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 14.5V7M8 7L2.5 2.5M8 7L13.5 2.5M2.5 7H13.5" stroke="#111111" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      );
    case 'stairs':
    default:
      return (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 2H14V14H2V10H6V6H10V2Z" fill="#111111" />
        </svg>
      );
  }
}

// Inline Hero Target Icon [🟢] and 8-Petal Flower Icon [🌸] (design.md Section E.3)
export function InlineTargetIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 6px', transform: 'translateY(-3px)' }}
    >
      <circle cx="21" cy="21" r="18" stroke="#3BCF81" strokeWidth="3.5" fill="#E9FBF2" />
      <circle cx="21" cy="21" r="11.5" stroke="#3BCF81" strokeWidth="3.2" />
      <circle cx="21" cy="21" r="5" fill="#3BCF81" />
    </svg>
  );
}

export function InlineFlowerIcon({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px', transform: 'translateY(-2px)' }}
    >
      <circle cx="21" cy="7" r="4.2" fill="#D0075A" />
      <circle cx="21" cy="35" r="4.2" fill="#D0075A" />
      <circle cx="7" cy="21" r="4.2" fill="#D0075A" />
      <circle cx="35" cy="21" r="4.2" fill="#D0075A" />
      <circle cx="11.2" cy="11.2" r="4.2" fill="#E88DB1" />
      <circle cx="30.8" cy="30.8" r="4.2" fill="#E88DB1" />
      <circle cx="30.8" cy="11.2" r="4.2" fill="#E88DB1" />
      <circle cx="11.2" cy="30.8" r="4.2" fill="#E88DB1" />
      <circle cx="21" cy="21" r="5.2" fill="#D0075A" />
    </svg>
  );
}

// Inline Gold Clover [🌼] and Magenta Hourglass [⏳] for Problem / About statement (design.md Section E.4)
export function InlineGoldClover({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 6px', transform: 'translateY(-4px)' }}
    >
      <path d="M6 6H25C25 16.5 16.5 25 6 25V6Z" fill="#E5B433" />
      <path d="M48 6V25C37.5 25 29 16.5 29 6H48Z" fill="#E5B433" />
      <path d="M6 48V29C16.5 29 25 37.5 25 48H6Z" fill="#E5B433" />
      <path d="M48 48H29C29 37.5 37.5 29 48 29V48Z" fill="#E5B433" />
      <rect x="21" y="21" width="12" height="12" fill="#E5B433" />
    </svg>
  );
}

export function InlineMagentaSpool({ size = 48 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 54 54"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 6px', transform: 'translateY(-4px)' }}
    >
      <rect x="8" y="6" width="38" height="7" rx="3.5" fill="#D0075A" />
      <path d="M10 15H44L34 27L44 39H10L20 27L10 15Z" fill="#D0075A" />
      <rect x="8" y="41" width="38" height="7" rx="3.5" fill="#D0075A" />
    </svg>
  );
}

// 4 Geometric 79x79 Skill Tiles from frame_030 (design.md Section E.4)
export function SkillGeometricTile({ variant }) {
  if (variant === 'gold') {
    return (
      <div
        aria-hidden="true"
        style={{
          width: '74px',
          height: '74px',
          backgroundColor: '#E5B433',
          border: '2px dashed #111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="20" y="3" width="10" height="10" transform="rotate(45 20 3)" fill="#111111" />
          <rect x="20" y="23" width="10" height="10" transform="rotate(45 20 23)" fill="#111111" />
          <rect x="10" y="13" width="10" height="10" transform="rotate(45 10 13)" fill="#111111" />
          <rect x="30" y="13" width="10" height="10" transform="rotate(45 30 13)" fill="#111111" />
        </svg>
      </div>
    );
  }
  if (variant === 'green') {
    return (
      <div
        aria-hidden="true"
        style={{
          width: '74px',
          height: '74px',
          backgroundColor: '#3BCF81',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <svg width="74" height="74" viewBox="0 0 74 74" fill="none">
          <path d="M37 0V74M0 37H74M5 5L69 69M69 5L5 69" stroke="#111111" strokeWidth="3.5" />
          <circle cx="37" cy="37" r="19" fill="#3BCF81" />
          <circle cx="37" cy="37" r="15" fill="#D0075A" />
        </svg>
      </div>
    );
  }
  if (variant === 'magenta') {
    return (
      <div
        aria-hidden="true"
        style={{
          width: '74px',
          height: '74px',
          backgroundColor: '#D0075A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="68" height="44" viewBox="0 0 68 44" fill="none">
          <path d="M2 22C12 6 23 2 34 2C45 2 56 6 66 22C56 38 45 42 34 42C23 42 12 38 2 22Z" fill="#FFFFFF" />
          <circle cx="34" cy="22" r="12" fill="#D0075A" />
          <path d="M34 13L36.5 19.5L43 22L36.5 24.5L34 31L31.5 24.5L25 22L31.5 19.5L34 13Z" fill="#E5B433" />
        </svg>
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: '74px',
        height: '74px',
        backgroundColor: '#42D2ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="74" height="74" viewBox="0 0 74 74" fill="none">
        <circle cx="16" cy="16" r="9" fill="#D0075A" />
        <circle cx="58" cy="58" r="9" fill="#D0075A" />
        <circle cx="58" cy="16" r="2.5" fill="#111111" />
        <circle cx="16" cy="58" r="2.5" fill="#111111" />
        <circle cx="37" cy="37" r="2.5" fill="#111111" />
      </svg>
    </div>
  );
}

// Hand-drawn triple underline SVG (design.md Section E.3 & E.5)
export function HandUnderline({ width = 120 }) {
  return (
    <svg width={width} height="14" viewBox="0 0 120 14" fill="none" aria-hidden="true" style={{ display: 'block', margin: '2px auto 0' }}>
      <path d="M4 4C36 2 84 2 116 4" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 8C42 6.5 78 6.5 110 8" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 12C40 10 82 10 118 11.5" stroke="#111111" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Green 4-Leaf Mascot Character from Let's Talk Section (frame_037) with Cursor-Tracking Eyes
export function CloverMascot({ eyeOffset = { x: 0, y: 0 } }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 440 410"
      fill="none"
      aria-label="Quorum 4-Leaf Clover Mascot"
      style={{ maxWidth: '420px', display: 'block' }}
    >
      <path
        d="M216 68C165 10 62 -10 26 42C-10 94 22 174 88 210C22 252 -4 334 38 380C80 426 168 398 220 340C272 398 358 422 400 374C442 326 410 246 346 206C410 166 436 86 394 40C352 -6 267 12 216 68Z"
        fill="#3BCF81"
        stroke="#111111"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g transform={`translate(${eyeOffset.x}, ${eyeOffset.y})`}>
        <rect x="234" y="102" width="26" height="74" rx="13" transform="rotate(-6 234 102)" fill="#111111" />
        <rect x="282" y="96" width="26" height="74" rx="13" transform="rotate(-6 282 96)" fill="#111111" />
      </g>
    </svg>
  );
}
