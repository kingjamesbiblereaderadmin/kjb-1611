import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [footerHeight, setFooterHeight] = useState(80);

  useEffect(() => {
    const scroller = document.getElementById('kjb-scroll');
    const target = scroller || window;
    const getY = () => (scroller ? scroller.scrollTop : window.scrollY);
    const handleScroll = () => {
      setVisible(getY() > 300);
    };
    target.addEventListener('scroll', handleScroll, { passive: true });

    // Calculate footer height based on nav mode
    const updateFooterHeight = () => {
      try {
        const showMode = localStorage.getItem('kjb-footer-mode') || 'one';
        // Mobile footer: one row = ~56px, two rows = ~112px, none = 0
        // Add safe area inset for bottom
        const safeArea = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat-bottom') || '0');
        const baseHeight = showMode === 'two' ? 112 : showMode === 'one' ? 56 : 0;
        // Sit half over the bottom nav (overlapping it) instead of floating
        // fully above it with a gap — a standard floating-action-button look.
        setFooterHeight(baseHeight / 2 + safeArea + 8);
      } catch {
        setFooterHeight(80);
      }
    };

    updateFooterHeight();
    window.addEventListener('storage', updateFooterHeight);
    
    // Also check periodically in case localStorage changes
    const interval = setInterval(updateFooterHeight, 1000);

    return () => {
      target.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', updateFooterHeight);
      clearInterval(interval);
    };
  }, []);

  const scrollToTop = () => {
    const scroller = document.getElementById('kjb-scroll');
    if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed right-3 sm:right-5 lg:right-8 z-[55] p-1.5 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:bg-primary transition-all duration-300 opacity-80 hover:opacity-100 backdrop-blur-sm"
      aria-label="Scroll to top"
      style={{ bottom: `${footerHeight}px` }}
    >
      <ChevronUp className="w-3.5 h-3.5" />
    </button>
  );
}