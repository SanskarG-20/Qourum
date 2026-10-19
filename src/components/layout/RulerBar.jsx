import React, { useRef } from 'react';

export function RulerBar({ position = 'top' }) {
  const stripRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!stripRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / (rect.width || 1) - 0.5;
    const scrubOffset = Math.round(relX * -90);
    stripRef.current.style.transition = 'transform 60ms linear';
    stripRef.current.style.transform = `translateX(${scrubOffset}px)`;
  };

  const handleMouseLeave = () => {
    if (!stripRef.current) return;
    stripRef.current.style.transition = 'transform 400ms cubic-bezier(0.22, 1, 0.36, 1)';
    stripRef.current.style.transform = 'translateX(0px)';
  };

  const ticks = [];
  for (let val = 0; val <= 1600; val += 50) {
    ticks.push(val);
  }

  return (
    <div
      aria-hidden="true"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: 'var(--ruler-height)',
        backgroundColor: '#FFFFFF',
        borderBottom: position === 'top' ? '1px solid var(--color-border-ruler)' : 'none',
        borderTop: position === 'bottom' ? '1px solid var(--color-border-ruler)' : 'none',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
        cursor: 'ew-resize',
      }}
    >
      <div
        ref={stripRef}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '1800px',
          height: '100%',
          transform: 'translateX(0px)',
          paddingLeft: '24px',
        }}
      >
        {ticks.map((val) => {
          const isMajor = val % 100 === 0;
          return (
            <div
              key={val}
              style={{
                width: '56px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                height: '100%',
              }}
            >
              <div
                style={{
                  width: '1px',
                  height: isMajor ? '14px' : '8px',
                  backgroundColor: isMajor ? '#BBBBBB' : '#DDDDDD',
                }}
              />
              {isMajor && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-text-ruler)',
                    marginTop: '6px',
                    transform: 'translateX(-35%)',
                  }}
                >
                  {val}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
