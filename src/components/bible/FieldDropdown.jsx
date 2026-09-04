import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Shared custom dropdown list used by the NativeSelector (Contents "Go to
 * Passage") and the Reader's verse picker. Renders a neutral, borderless-on-
 * hover list with full text wrapping — replacing native <select> popups and
 * the old verse grid so every selector in the app shares one look.
 *
 * `value` matching is string-based so numbers and '' (Whole chapter) compare
 * reliably.
 */
export function FieldDropdownList({ options, value, onSelect, small }) {
  return (
    <div className="rounded-xl bg-background border border-border shadow-lg max-h-56 overflow-y-auto">
      {options.map(o => (
        <button
          key={String(o.value)}
          type="button"
          data-vaul-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSelect(o.value)}
          className={`notranslate w-full text-left px-3 py-2 ${small ? 'text-xs leading-snug' : 'text-sm'} border-b border-border/60 last:border-b-0 transition-colors ${
            String(o.value) === String(value) ? 'bg-secondary font-medium' : 'hover:bg-accent/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * FieldDropdown = labelled trigger button + absolutely-positioned
 * FieldDropdownList. Used standalone in the NativeSelector.
 */
export default function FieldDropdown({ label, value, options, onSelect, disabled, small }) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => String(o.value) === String(value));
  return (
    <div>
      {label && <label className="block font-sans text-xs text-muted-foreground mb-1.5">{label}</label>}
      <div className="relative">
        <button
          type="button"
          data-vaul-no-drag
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { if (!disabled) setOpen(o => !o); }}
          disabled={disabled}
          className={`w-full px-3 ${small ? 'py-3' : 'h-12'} rounded-xl bg-secondary text-secondary-foreground border border-border ${small ? 'text-sm' : 'text-base'} font-medium text-left flex items-center justify-between gap-2 disabled:opacity-50`}
        >
          <span className={`notranslate text-left leading-snug ${small ? '' : 'whitespace-nowrap'}`}>{current ? current.label : '—'}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && !disabled && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20">
            <FieldDropdownList
              options={options}
              value={value}
              onSelect={(v) => { onSelect(v); setOpen(false); }}
              small={small}
            />
          </div>
        )}
      </div>
    </div>
  );
}