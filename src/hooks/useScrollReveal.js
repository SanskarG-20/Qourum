import React, { useState, useEffect, useRef } from 'react';

export function useActiveSection(sectionIds = []) {
  const [activeId, setActiveId] = useState(sectionIds[0] || 'home');
  const activeRef = useRef(sectionIds[0] || 'home');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 260;
      let current = sectionIds[0] || 'home';
      for (let i = 0; i < sectionIds.length; i += 1) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          current = sectionIds[i];
        }
      }
      if (current !== activeRef.current) {
        activeRef.current = current;
        // Update nav tab background styles directly to avoid full-tree scroll re-renders
        const navLinks = document.querySelectorAll('[data-nav-section]');
        navLinks.forEach((link) => {
          const id = link.getAttribute('data-nav-section');
          link.style.backgroundColor = id === current ? 'var(--color-cyan-primary)' : 'transparent';
          link.style.fontWeight = id === current ? '600' : '500';
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds]);

  return [activeId, setActiveId];
}
