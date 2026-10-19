import React, { useEffect, useRef } from 'react';

// Authentic Nudge 5x7 Modular Rounded-Pixel Stencil Glyph Map (A-Z, 0-9, &, ', -)
const PIXEL_GLYPHS = {
  A: [
    '11111',
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
    '11111',
    '10001',
    '10000',
    '10000',
    '10000',
    '10001',
    '11111',
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
    '11111',
    '10000',
    '10000',
    '10111',
    '10001',
    '10001',
    '11111',
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
    '00010',
    '00010',
    '00010',
    '00010',
    '00010',
    '10010',
    '11111',
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
    '11111',
    '10101',
    '10101',
    '10101',
    '10101',
    '10101',
    '10101',
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
    '11111',
    '10001',
    '10001',
    '10001',
    '10001',
    '10001',
    '11111',
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
    '11111',
    '10001',
    '10001',
    '10001',
    '10101',
    '10010',
    '11111',
  ],
  R: [
    '11111',
    '10001',
    '10001',
    '11111',
    '10100',
    '10010',
    '10001',
  ],
  S: [
    '11111',
    '10000',
    '10000',
    '11111',
    '00001',
    '00001',
    '11111',
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
    '11111',
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

  // Decompose into continuous horizontal and vertical strokes to form solid connected letterforms (matching BEJAMAN style)
  const strokes = [];

  // 1. Horizontal continuous runs
  for (let r = 0; r < 7; r += 1) {
    let start = -1;
    for (let c = 0; c < 5; c += 1) {
      if (matrix[r][c] === '1') {
        if (start === -1) start = c;
      } else if (start !== -1) {
        strokes.push(
          <rect
            key={`h-${r}-${start}-${c - 1}`}
            x={start * 10}
            y={r * 10}
            width={(c - start) * 10}
            height="10"
            rx="5"
            fill={color}
          />
        );
        start = -1;
      }
    }
    if (start !== -1) {
      strokes.push(
        <rect
          key={`h-${r}-${start}-4`}
          x={start * 10}
          y={r * 10}
          width={(5 - start) * 10}
          height="10"
          rx="5"
          fill={color}
        />
      );
    }
  }

  // 2. Vertical continuous runs
  for (let c = 0; c < 5; c += 1) {
    let start = -1;
    for (let r = 0; r < 7; r += 1) {
      if (matrix[r][c] === '1') {
        if (start === -1) start = r;
      } else if (start !== -1) {
        strokes.push(
          <rect
            key={`v-${c}-${start}-${r - 1}`}
            x={c * 10}
            y={start * 10}
            width="10"
            height={(r - start) * 10}
            rx="5"
            fill={color}
          />
        );
        start = -1;
      }
    }
    if (start !== -1) {
      strokes.push(
        <rect
          key={`v-${c}-${start}-6`}
          x={c * 10}
          y={start * 10}
          width="10"
          height={(7 - start) * 10}
          rx="5"
          fill={color}
        />
      );
    }
  }

  // 3. Grid cell overlaps to guarantee solid interior joins
  for (let r = 0; r < 7; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      if (matrix[r][c] === '1') {
        strokes.push(
          <rect
            key={`c-${r}-${c}`}
            x={c * 10 - 0.2}
            y={r * 10 - 0.2}
            width="10.4"
            height="10.4"
            rx="1.5"
            fill={color}
          />
        );
      }
    }
  }

  return (
    <svg
      viewBox="0 0 50 70"
      fill="none"
      aria-hidden="true"
      style={{
        height: '0.88em',
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'baseline',
        margin: '0 0.04em',
        overflow: 'visible',
      }}
    >
      <defs>
        <filter id={`stencil-fillet-${upper}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -9"
            result="goo"
          />
        </filter>
      </defs>
      <g filter={`url(#stencil-fillet-${upper})`}>
        {strokes}
      </g>
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
  animateArrival = false,
  waitingForArrival = false,
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
                className={animateArrival ? 'quorum-char-arrive' : ''}
                style={{
                  opacity: waitingForArrival && !animateArrival ? 0 : 1,
                  transition: 'opacity 120ms linear',
                  display: 'inline-block',
                  animationDelay: animateArrival ? `${chIdx * 65}ms` : undefined,
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
