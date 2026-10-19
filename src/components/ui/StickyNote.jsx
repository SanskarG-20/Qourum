import React from 'react';

const TINT_MAP = {
  cyan: '#ABEBF7',
  yellow: '#F2DEA3',
  pink: '#F6B6D0',
  mint: '#A6E3C4',
};

export function StickyNote({
  tint = 'yellow',
  rotationDeg = 0,
  title,
  children,
  padding = '24px 28px',
  maxWidth = '480px',
  style = {},
  className = '',
}) {
  const bg = TINT_MAP[tint] || tint;
  return (
    <div
      className={className}
      style={{
        backgroundColor: bg,
        padding,
        maxWidth,
        transform: rotationDeg ? `rotate(${rotationDeg}deg)` : undefined,
        color: '#111111',
        transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        ...style,
      }}
    >
      {title && (
        <h3
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'clamp(1.35rem, 2vw, 2.1rem)',
            fontWeight: 500,
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            marginBottom: '14px',
            color: '#111111',
          }}
        >
          {title}
        </h3>
      )}
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '16px',
          lineHeight: 1.55,
          color: '#1A1A1A',
        }}
      >
        {children}
      </div>
    </div>
  );
}
