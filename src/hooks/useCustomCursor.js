import { useState, useEffect } from 'react';

export function useCustomCursor() {
  const [cursor, setCursor] = useState({
    x: -100,
    y: -100,
    visible: false,
    mode: 'default', // 'default' | 'see' | 'grab'
    pillBg: '#111111',
    pillText: '#FFFFFF',
    label: 'YOU',
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    if (mediaQuery.matches || coarsePointer.matches) {
      return undefined;
    }

    const handleMouseMove = (e) => {
      const target = e.target;
      const seeCard = target && target.closest ? target.closest('[data-cursor-see]') : null;
      const grabZone = target && target.closest ? target.closest('[data-cursor-grab]') : null;
      const toneEl = target && target.closest ? target.closest('[data-cursor-tone]') : null;

      let pillBg = '#111111';
      let pillText = '#FFFFFF';
      if (toneEl) {
        const tone = toneEl.getAttribute('data-cursor-tone');
        if (tone === 'cyan') { pillBg = '#42D2ED'; pillText = '#111111'; }
        else if (tone === 'gold') { pillBg = '#E5B433'; pillText = '#111111'; }
        else if (tone === 'magenta') { pillBg = '#D0075A'; pillText = '#FFFFFF'; }
        else if (tone === 'green') { pillBg = '#3BCF81'; pillText = '#111111'; }
      }

      setCursor({
        x: e.clientX,
        y: e.clientY,
        visible: true,
        mode: seeCard ? 'see' : grabZone ? 'grab' : 'default',
        pillBg,
        pillText,
        label: seeCard ? seeCard.getAttribute('data-cursor-see') || 'See' : 'YOU',
      });
    };

    const handleMouseLeave = () => {
      setCursor((prev) => ({ ...prev, visible: false }));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return cursor;
}
