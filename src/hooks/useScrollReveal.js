import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

export function useActiveSection(sectionIds = []) {
  const [activeId, setActiveId] = useState(sectionIds[0] || 'home');
  const activeRef = useRef(activeId);

  const updateActiveId = (nextId) => {
    activeRef.current = nextId;
    setActiveId((previous) => (previous === nextId ? previous : nextId));
  };

  useEffect(() => {
    let frameId = 0;
    const handleScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        const scrollPosition = window.scrollY + 260;
        let current = sectionIds[0] || 'home';
        for (let i = 0; i < sectionIds.length; i += 1) {
          const el = document.getElementById(sectionIds[i]);
          if (el && el.offsetTop <= scrollPosition) {
            current = sectionIds[i];
          }
        }
        if (current !== activeRef.current) updateActiveId(current);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [sectionIds]);

  return [activeId, updateActiveId];
}

export function SectionRevealObserver() {
  useLayoutEffect(() => {
    const sections = Array.from(
      document.querySelectorAll('main > section[id]:not(#home), footer[data-motion-section]')
    );
    if (!sections.length) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sections.forEach((section) => section.classList.add('scroll-reveal-ready'));

    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      sections.forEach((section) => section.classList.add('scroll-revealed'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('scroll-revealed');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.01, rootMargin: '0px 0px -10% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return null;
}
