import React from 'react';

export default function ScriptureBanner() {
  const bgStyle = { backgroundImage: 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--accent)))' };

  return (
    <div className="rounded-2xl shadow-lg px-4 sm:px-6 py-6 text-center text-white mb-6" style={bgStyle}>
      <div className="flex items-center justify-center gap-3 xs:gap-6 mb-4 w-full px-2 xs:px-4">
        <span className="h-px flex-1 bg-current opacity-50" />
        <p
          className="notranslate font-sans text-xs xs:text-base font-black tracking-[0.12em] xs:tracking-[0.22em] uppercase flex-shrink-0 text-white/80"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.45)' }}
        >
          2 Timothy 2:15
        </p>
        <span className="h-px flex-1 bg-current opacity-50" />
      </div>
      <blockquote
        className="notranslate font-serif text-base sm:text-lg leading-relaxed max-w-3xl mx-auto font-semibold"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
      >
        "Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth."
      </blockquote>
    </div>
  );
}