import React from 'react';
import { Palette, Eye, Type, RotateCcw, X } from 'lucide-react';

export default function StyleEditorPanel({ 
  showStyleEditor, 
  textColor, 
  textOpacity, 
  a11yFont, 
  fontFamily, 
  onTextColorChange, 
  onTextOpacityChange, 
  onFontFamilyChange, 
  onClose 
}) {
  if (!showStyleEditor) return null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      className="absolute top-12 right-2 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-xl shadow-xl p-4 w-72 border border-white/20"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-sans text-sm font-semibold text-slate-800 dark:text-slate-200">Text Style</h3>
        <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTextColorChange('#ffffff');
            onTextOpacityChange(1);
            onFontFamilyChange('serif');
          }}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary hover:bg-accent/20 text-slate-700 dark:text-slate-300 font-sans text-[10px] font-medium transition-colors touch-manipulation"
        >
          <RotateCcw className="w-2.5 h-2.5 pointer-events-none" />
          Reset All
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors touch-manipulation"
        >
          <X className="w-4 h-4 text-slate-600 dark:text-slate-400 pointer-events-none" />
        </button>
        </div>
      </div>

      {/* Text Color */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 font-sans text-xs font-medium text-slate-700 dark:text-slate-300">
            <Palette className="w-3.5 h-3.5" />
            Text Color
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            '#000000', '#1a1a1a', '#ffffff', '#f8f8f8',
            '#fef3c7', '#fde68a', '#fbbf24', '#f59e0b',
            '#dbeafe', '#93c5fd', '#3b82f6', '#1e40af',
            '#fecaca', '#fca5a5', '#ef4444', '#b91c1c',
            '#ddd6fe', '#a78bfa', '#8b5cf6', '#5b21b6',
            '#bbf7d0', '#6ee7b7', '#10b981', '#047857',
            '#ffe4e6', '#fda4af', '#ec4899', '#9d174d',
            '#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1'
          ].map(color => (
            <button
              key={color}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onTextColorChange(color);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onTextColorChange(color);
              }}
              className={`w-7 h-7 rounded-lg border-2 transition-all ${
                textColor === color ? 'border-slate-800 scale-110' : 'border-slate-300 hover:border-slate-500'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Text Opacity */}
      <div className="mb-4">
        <label className="flex items-center gap-2 font-sans text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Eye className="w-3.5 h-3.5" />
          Opacity: {Math.round(textOpacity * 100)}%
        </label>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={textOpacity}
          onChange={(e) => onTextOpacityChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-slate-200"
        />
      </div>

      {/* Font Family */}
      <div className="mb-2">
        <label className="flex items-center gap-2 font-sans text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Type className="w-3.5 h-3.5" />
          Font Family
        </label>
        {a11yFont !== 'default' && (
          <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400 mb-2 leading-snug">
            An accessibility font is active app-wide and overrides reading fonts. Pick another accessibility font, or disable it in Settings → Accessibility.
          </p>
        )}
        {/* Standard fonts */}
        <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400 mb-1">Standard</p>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {[
            { value: 'serif', label: 'Serif', cssFamily: "'Merriweather', 'Cormorant Garamond', Georgia, serif" },
            { value: 'sans-serif', label: 'Sans', cssFamily: "'Inter', system-ui, sans-serif" },
            { value: 'monospace', label: 'Mono', cssFamily: "'Courier New', monospace" },
            { value: 'cursive', label: 'Cursive', cssFamily: "'Dancing Script', cursive" },
            { value: 'comic-sans', label: 'Comic', cssFamily: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', system-ui, sans-serif" },
            { value: 'times', label: 'Times', cssFamily: "'Times New Roman', Times, serif" },
          ].filter(f => f.value !== 'comic-sans' || (typeof window !== 'undefined' && window.innerWidth >= 640)).map(font => {
            const a11yActive = a11yFont !== 'default';
            const isActive = !a11yActive && fontFamily === font.value;
            const isDisabled = a11yActive;
            return (
            <button
              key={font.value}
              disabled={isDisabled}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onFontFamilyChange(font.value);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onFontFamilyChange(font.value);
              }}
              style={{ fontFamily: font.cssFamily }}
              className={`kjb-font-preview px-1.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              } ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}
            >
              {font.label}
            </button>
            );
          })}
        </div>
        {/* Accessibility fonts */}
        <p className="font-sans text-[10px] text-slate-500 dark:text-slate-400 mt-3 mb-1.5">Accessibility</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { value: 'dyslexic', label: 'Dyslexic', cssFamily: "'OpenDyslexic', 'Comic Sans MS', sans-serif" },
            { value: 'hyperlegible', label: 'Legible', cssFamily: "'Atkinson Hyperlegible', system-ui, sans-serif" },
          ].map(font => {
            const a11yActive = a11yFont !== 'default';
            const isActive = a11yActive ? a11yFont === font.value : false;
            return (
            <button
              key={font.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onFontFamilyChange(font.value);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onFontFamilyChange(font.value);
              }}
              style={{ fontFamily: font.cssFamily }}
              className={`kjb-font-preview px-1.5 py-1.5 rounded-md text-[10px] font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {font.label}
            </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}