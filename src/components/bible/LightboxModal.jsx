import React from 'react';
import { X } from 'lucide-react';
import { renderVerseText } from '@/lib/bibleApi';
import { cleanVerseText } from '@/lib/formatDailyVerse';

export default function LightboxModal({ 
  showLightbox, 
  verse, 
  isOffline, 
  textColor, 
  textOpacity, 
  resolvedFont, 
  onClose 
}) {
  if (!showLightbox) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center bg-black/90 backdrop-blur-sm overflow-y-auto py-6"
      style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onClose();
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onClose();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
    >
      <div
        className="relative max-w-6xl w-full mx-4 p-8 md:p-12 rounded-2xl shadow-2xl text-center"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onClose();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onClose();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          className="absolute top-2 right-2 p-4 -m-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          type="button"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <p 
          className="font-sans text-xs font-semibold tracking-widest uppercase mb-10 text-white"
          style={{ opacity: 0.8 * textOpacity, color: textColor, fontFamily: resolvedFont }}
        >
          {isOffline ? 'Offline Verse of the Day' : 'Verse of the Day'}
        </p>
        <blockquote 
          className="mb-12 [&_em]:italic text-4xl md:text-6xl"
          style={{ 
            color: textColor, 
            opacity: textOpacity, 
            fontFamily: resolvedFont,
            fontWeight: '700',
            lineHeight: '1.6',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          "<span dangerouslySetInnerHTML={{ __html: renderVerseText(cleanVerseText(verse.text)) }} />"
        </blockquote>
        <p 
          className="text-base md:text-lg font-semibold mt-12"
          style={{ 
            opacity: Math.min(1, textOpacity + 0.05), 
            color: textColor, 
            fontFamily: resolvedFont,
            textShadow: '0 1px 4px rgba(0,0,0,0.3)'
          }}
        >
          — {verse.ref}
        </p>
        <div 
          className="mt-8 w-16 h-1 mx-auto bg-white"
          style={{ opacity: 0.75 * textOpacity, backgroundColor: textColor }}
        />
      </div>
    </div>
  );
}