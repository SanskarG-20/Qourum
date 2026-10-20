import React, { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Shared pointer state
// Every badge reads the same cursor position from one global listener rather
// than each installing its own.
// ---------------------------------------------------------------------------
const pointerState = { x: -99999, y: -99999 };
let pointerBound = false;

const bindPointer = () => {
  if (pointerBound || typeof window === 'undefined') return;
  pointerBound = true;
  window.addEventListener(
    'mousemove',
    (e) => {
      pointerState.x = e.clientX;
      pointerState.y = e.clientY;
    },
    { passive: true }
  );
};

// ---------------------------------------------------------------------------
// CSS cubic-bezier solver, so the hover transition can use the exact
// cubic-bezier(0.34, 1.56, 0.64, 1) curve from the reference recording while
// still living in the same transform as the spring-driven repulsion.
// ---------------------------------------------------------------------------
const cubicBezier = (x1, y1, x2, y2) => {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const s = slope(t, x1, x2);
      if (s === 0) break;
      const err = calc(t, x1, x2) - x;
      if (Math.abs(err) < 1e-6) break;
      t -= err / s;
    }
    return calc(t, y1, y2);
  };
};

const HOVER_EASE = cubicBezier(0.34, 1.56, 0.64, 1);
const HOVER_MS = 280;
const TILT_FACTOR = 0.64; // hover unwinds 35% of the rest tilt
const HOVER_SCALE = 1.06;
const REPEL_RADIUS = 110; // px — proximity trigger
const REPEL_MAX = 18; // px — maximum displacement
const INSIDE_MARGIN = 8; // px — treat this close to the badge as "on it"
const SPRING_STIFFNESS = 300;
const SPRING_DAMPING = 26;
const CENTRE_REFRESH_MS = 90;

/**
 * A floating Figma-style multiplayer cursor badge.
 *
 * Three layers:
 *   .cursor-badge-track  — the outer motion wrapper; owns the continuous
 *                          diagonal keyframe glide along the vector its arrow
 *                          points toward.
 *   .cursor-badge-inner  — the interactive wrapper; owns the rest tilt plus
 *                          the hover and magnetic-repulsion spring physics.
 *   arrow + pill         — sibling elements inside the inner wrapper.
 */
export function CursorBadge({
  label,
  bgColor = '#E5B433',
  textColor = '#111111',
  pointerCorner = 'top-right', // 'top-left' | 'top-right' | 'none'
  rotationDeg = 0,
  float = null, // 'gold' | 'magenta' | null — enables the diagonal glide
  style = {},
  className = '',
}) {
  const innerRef = useRef(null);
  const trackRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const hoveredRef = useRef(false);
  const rotationRef = useRef(rotationDeg);
  const physics = useRef({ x: 0, y: 0, vx: 0, vy: 0, dirX: 0, dirY: 1 });
  const hoverAnim = useRef(null);
  const tilt = useRef({ value: rotationDeg });
  const scale = useRef({ value: 1 });
  const centre = useRef({ x: 0, y: 0, measured: -CENTRE_REFRESH_MS * 2 });
  const lastTs = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    bindPointer();
  }, []);

  // Start the hover transition (tilt unwind + scale up) on every change.
  useEffect(() => {
    hoveredRef.current = hovered;
    const fromTilt = tilt.current.value;
    const fromScale = scale.current.value;
    const toTilt = rotationDeg * (hovered ? TILT_FACTOR : 1);
    const toScale = hovered ? HOVER_SCALE : 1;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      tilt.current.value = toTilt;
      scale.current.value = toScale;
      hoverAnim.current = null;
      return;
    }

    hoverAnim.current = {
      fromTilt,
      fromScale,
      toTilt,
      toScale,
      start: performance.now(),
    };
  }, [hovered, rotationDeg]);

  // The spring loop: repulsion, hover easing and the composed transform.
  useEffect(() => {
    const node = innerRef.current;
    const track = trackRef.current;
    if (!node || !track) return undefined;

    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tiltRadians = (rotationDeg * Math.PI) / 180;
    const cosTilt = Math.cos(tiltRadians);
    const sinTilt = Math.sin(tiltRadians);

    const frame = (now) => {
      const dt = lastTs.current ? Math.min((now - lastTs.current) / 1000, 1 / 30) : 1 / 60;
      lastTs.current = now;

      // Refresh the badge's HOME centre (throttled). The home position is the
      // track box, which carries the diagonal glide but NOT the repulsion
      // offset — measuring against the offset position would make the badge
      // chase its own tail.
      if (now - centre.current.measured > CENTRE_REFRESH_MS) {
        const rect = track.getBoundingClientRect();
        centre.current.x = rect.left + rect.width / 2;
        centre.current.y = rect.top + rect.height / 2;
        centre.current.halfW = track.offsetWidth / 2;
        centre.current.halfH = track.offsetHeight / 2;
        centre.current.measured = now;
      }

      // Magnetic repulsion: push the badge away from the pointer — but never
      // while the pointer is actually on it. Repelling an element out from
      // under the cursor would eject the pointer, re-trigger the spring and
      // thrash the hover state forever.
      const p = physics.current;
      let targetX = 0;
      let targetY = 0;
      if (!reducedQuery.matches) {
        // Vector from the pointer to the badge centre — the badge is pushed
        // along it, i.e. away from the cursor.
        const toBadgeX = centre.current.x - pointerState.x;
        const toBadgeY = centre.current.y - pointerState.y;
        const dist = Math.hypot(toBadgeX, toBadgeY);

        // Pointer position in the badge's own (rotated) frame. Only the
        // magnitudes matter, so the sign is irrelevant here.
        const localX = -toBadgeX * cosTilt + toBadgeY * sinTilt;
        const localY = toBadgeX * sinTilt + toBadgeY * cosTilt;
        const onBadge =
          Math.abs(localX) <= centre.current.halfW + INSIDE_MARGIN &&
          Math.abs(localY) <= centre.current.halfH + INSIDE_MARGIN;

        if (!onBadge && dist < REPEL_RADIUS) {
          // Near the exact centre the direction is ambiguous — reuse the last
          // one so the badge does not flip sides as the pointer crosses it.
          let ux;
          let uy;
          if (dist > 0.5) {
            ux = toBadgeX / dist;
            uy = toBadgeY / dist;
            p.dirX = ux;
            p.dirY = uy;
          } else {
            ux = p.dirX;
            uy = p.dirY;
          }
          const magnitude = REPEL_MAX * (1 - dist / REPEL_RADIUS);
          targetX = ux * magnitude;
          targetY = uy * magnitude;
        }
      }

      // Spring integration, sub-stepped for stability.
      const subSteps = 4;
      const h = dt / subSteps;
      for (let i = 0; i < subSteps; i += 1) {
        const ax = (targetX - p.x) * SPRING_STIFFNESS - p.vx * SPRING_DAMPING;
        const ay = (targetY - p.y) * SPRING_STIFFNESS - p.vy * SPRING_DAMPING;
        p.vx += ax * h;
        p.vy += ay * h;
        p.x += p.vx * h;
        p.y += p.vy * h;
      }

      // Hover tilt unwind + scale, eased along the reference curve.
      const anim = hoverAnim.current;
      let t = tilt.current.value;
      let s = scale.current.value;
      if (anim) {
        const progress = Math.min(1, (now - anim.start) / HOVER_MS);
        const eased = HOVER_EASE(progress);
        t = anim.fromTilt + (anim.toTilt - anim.fromTilt) * eased;
        s = anim.fromScale + (anim.toScale - anim.fromScale) * eased;
        if (progress >= 1) hoverAnim.current = null;
      } else {
        t = rotationRef.current * (hoveredRef.current ? TILT_FACTOR : 1);
        s = hoveredRef.current ? HOVER_SCALE : 1;
      }
      tilt.current.value = t;
      scale.current.value = s;

      node.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) rotate(${t.toFixed(2)}deg) scale(${s.toFixed(3)})`;

      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    rotationRef.current = rotationDeg;
  }, [rotationDeg]);

  const trackClass = `cursor-badge-track${float ? ` cursor-badge-track--${float}` : ''}`;

  return (
    <div ref={trackRef} className={`${trackClass} ${className}`} style={style}>
      <div
        ref={innerRef}
        className={`cursor-badge-inner${hovered ? ' is-hovered' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {pointerCorner === 'top-left' && (
          <svg
            className="cursor-badge-arrow cursor-badge-arrow--tl"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            aria-hidden="true"
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
          className="cursor-badge-pill"
          style={{ backgroundColor: bgColor, color: textColor }}
        >
          {label}
        </div>

        {pointerCorner === 'top-right' && (
          <svg
            className="cursor-badge-arrow cursor-badge-arrow--tr"
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            aria-hidden="true"
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
    </div>
  );
}
