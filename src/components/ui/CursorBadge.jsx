import React, { useState } from 'react';

export function CursorBadge({
  label,
  bgColor = '#E5B433',
  textColor = '#111111',
  pointerCorner = 'top-right', // 'top-left' | 'top-right' | 'none'
  rotationDeg = 0,
  style = {},
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false);

  const currentTransform = isHovered
    ? `translate3d(0, -4px, 0) rotate(${rotationDeg * 0.65}deg) scale(1.04)`
    : `translate3d(0, 0, 0) rotate(${rotationDeg}deg) scale(1)`;

  return (
    <div
      aria-hidden="true"
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        transform: currentTransform,
        transition: 'transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        userSelect: 'none',
        cursor: 'default',
        willChange: 'transform',
        ...style,
      }}
    >
      {pointerCorner === 'top-left' && (
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          style={{ position: 'absolute', top: '-20px', left: '-18px' }}
        >
          <path
            d="M3 3L23 10L14 14L10 23L3 3Z"
            fill={bgColor}
            stroke="#111111"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}

      <div
        style={{
          backgroundColor: bgColor,
          color: textColor,
          border: '2px solid #111111',
          borderRadius: '28px',
          padding: '11px 24px',
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>

      {pointerCorner === 'top-right' && (
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          style={{ position: 'absolute', top: '-20px', right: '-18px' }}
        >
          <path
            d="M23 3L3 10L12 14L16 23L23 3Z"
            fill={bgColor}
            stroke="#111111"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}
