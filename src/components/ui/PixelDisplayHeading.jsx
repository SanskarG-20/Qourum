import React, { useEffect, useRef } from 'react';

// Authentic Nudge 5x7 Modular Rounded-Pixel Stencil Glyph Map (A-Z, 0-9, &, ', -)
const PIXEL_GLYPHS = {
  A: [
    '01110',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001',
  ],
  B: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10001',
    '10001',
    '11110',
  ],
  C: [
    '01110',
    '10001',
    '10000',
    '10000',
    '10000',
    '10001',
    '01110',
  ],
  D: [
    '11110',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '11110',
  ],
  E: [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '11111',
  ],
  F: [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '10000',
  ],
  G: [
    '01111',
    '10000',
    '10000',
    '10111',
    '10001',
    '10001',
    '01110',
  ],
  H: [
    '10001',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001',
  ],
  I: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '11111',
  ],
  J: [
    '00111',
    '00010',
    '00010',
    '00010',
    '10010',
    '10010',
    '01100',
  ],
  K: [
    '10001',
    '10010',
    '10100',
    '11000',
    '10100',
    '10010',
    '10001',
  ],
  L: [
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '10000',
    '11111',
  ],
  M: [
    '10001',
    '11011',
    '10101',
    '10101',
    '10001',
    '10001',
    '10001',
  ],
  N: [
    '10001',
    '11001',
    '10101',
    '10011',
    '10001',
    '10001',
    '10001',
  ],
  O: [
    '01110',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '01110',
  ],
  P: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10000',
    '10000',
    '10000',
  ],
  Q: [
    '01110',
    '10001',
    '10001',
    '10001',
    '10101',
    '10010',
    '01101',
  ],
  R: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10100',
    '10010',
    '10001',
  ],
  S: [
    '01111',
    '10000',
    '10000',
    '01110',
    '00001',
    '00001',
    '11110',
  ],
  T: [
    '11111',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
    '00100',
  ],
  U: [
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '01110',
  ],
  V: [
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '01010',
    '00100',
  ],
  W: [
    '10001',
    '10001',
    '10001',
    '10101',
    '10101',
    '11011',
    '10001',
  ],
  X: [
    '10001',
    '10001',
    '01010',
    '00100',
    '01010',
    '10001',
    '10001',
  ],
  Y: [
    '10001',
    '10001',
    '01010',
    '00100',
    '00100',
    '00100',
    '00100',
  ],
  Z: [
    '11111',
    '00001',
    '00010',
    '00100',
    '01000',
    '10000',
    '11111',
  ],
  '&': [
    '01100',
    '10010',
    '01100',
    '01010',
    '10001',
    '10010',
    '01101',
  ],
  "'": [
    '00100',
    '00100',
    '00000',
    '00000',
    '00000',
    '00000',
    '00000',
  ],
};

function PixelGlyphSvg({ char, color = '#111111' }) {
  const upper = char.toUpperCase();
  if (upper === ' ') {
    return <span style={{ display: 'inline-block', width: '0.45em' }} />;
  }
  const matrix = PIXEL_GLYPHS[upper];
  if (!matrix) {
    return <span>{char}</span>;
  }

  const rects = [];
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (matrix[r][c] === '1') {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * 10}
            y={r * 10}
            width="10.6"
            height="10.6"
            rx="2.6"
            fill={color}
          />
        );
      }
    }
  }

  return (
    <svg
      viewBox="0 0 52 72"
      fill="none"
      aria-hidden="true"
      style={{
        height: '0.88em',
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'baseline',
        margin: '0 0.035em',
        overflow: 'visible',
      }}
    >
      {rects}
    </svg>
  );
}

export function PixelDisplayHeading({
  lines = ['QUORUM'],
  as: Tag = 'h2',
  size = 'var(--text-display-section)',
  scrollFade = true,
  align = 'center',
  color = '#111111',
  style = {},
}) {
  const containerRef = useRef(null);
  const fullLabel = lines.join(' ');
  const totalChars = lines.reduce((sum, l) => sum + l.length, 0);

  useEffect(() => {
    if (!scrollFade) return undefined;

    const updateCharOpacities = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 870;
      const raw = (vh - rect.top) / (vh * 0.65);
      const revealProgress = Math.min(1, Math.max(0.42, raw));
      const threshold = revealProgress * 1.15;

      const spans = el.querySelectorAll('[data-char-pos]');
      spans.forEach((sp) => {
        const normalizedPos = parseFloat(sp.getAttribute('data-char-pos') || '0');
        let charOpacity = 1;
        if (normalizedPos > threshold - 0.35) {
          const dist = (normalizedPos - (threshold - 0.35)) / 0.55;
          charOpacity = Math.max(0.18, Math.min(1, 1 - dist * 0.82));
        }
        sp.style.opacity = String(charOpacity);
      });
    };

    window.addEventListener('scroll', updateCharOpacities, { passive: true });
    updateCharOpacities();
    return () => window.removeEventListener('scroll', updateCharOpacities);
  }, [scrollFade]);

  let globalCharIndex = 0;

  return (
    <Tag
      ref={containerRef}
      aria-label={fullLabel}
      style={{
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.06,
        textAlign: align,
        color,
        userSelect: 'none',
        position: 'relative',
        ...style,
      }}
    >
      {/* Visually hidden accessible text for screen readers and DOM text queries */}
      <span
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {fullLabel}
      </span>

      {lines.map((line, lineIdx) => (
        <span
          key={lineIdx}
          aria-hidden="true"
          style={{
            display: 'block',
            marginBottom: lineIdx < lines.length - 1 ? '0.08em' : 0,
          }}
        >
          {line.split('').map((ch, chIdx) => {
            const idx = globalCharIndex++;
            const normalizedPos = totalChars > 1 ? (idx / (totalChars - 1)).toFixed(3) : '0';
            return (
              <span
                key={chIdx}
                data-char-pos={normalizedPos}
                style={{
                  opacity: 1,
                  transition: 'opacity 120ms linear',
                  display: 'inline-block',
                }}
              >
                <PixelGlyphSvg char={ch} color={color} />
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
