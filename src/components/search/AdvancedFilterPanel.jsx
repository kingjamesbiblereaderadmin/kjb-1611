import React, { useState } from 'react';
import { RotateCcw, ArrowUpDown, ChevronDown } from 'lucide-react';
import { NUMERIC_METRICS, BOOLEAN_METRICS } from '@/lib/verseAnalysis';
import { BIBLE_BOOKS } from '@/lib/bibleData';

// A collapsible section wrapper so users can hide/show ("deselect") each group
// of filters to keep the panel tidy.
function Section({ title, icon: Icon, open, onToggle, children }) {
  return (
    <div className="rounded-2xl bg-card/70 border border-border/60 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-accent/5 transition-colors text-left"
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          <span className="font-sans text-sm font-semibold text-foreground">{title}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// The full filter + sort control panel for Advanced Search. Controlled — the
// parent owns the `filters` object and passes `onChange(next)`.
export default function AdvancedFilterPanel({ filters, onChange, onReset, availability, metricRanges, textDraft, onTextDraftChange }) {
  const [openSections, setOpenSections] = useState({
    scope: true,
    sort: true,
    numeric: true,
    property: true,
  });
  const toggleSection = (k) => setOpenSections(prev => ({ ...prev, [k]: !prev[k] }));

  const set = (patch) => onChange({ ...filters, ...patch });
  const setRange = (key, side, value) =>
    onChange({ ...filters, ranges: { ...filters.ranges, [key]: { ...filters.ranges[key], [side]: value } } });
  const setBool = (key, value) =>
    onChange({ ...filters, bools: { ...filters.bools, [key]: value } });

  const books = filters.testament === 'all'
    ? BIBLE_BOOKS
    : BIBLE_BOOKS.filter(b => b.testament === filters.testament);

  const noSort = filters.sortKey === 'none';
  const isCanonical = filters.sortKey === 'canonical';

  return (
    <div className="space-y-4">
      {/* Scope + text */}
      <Section title="Scope & text" open={openSections.scope} onToggle={() => toggleSection('scope')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs text-muted-foreground mb-1">Testament</label>
            <select
              value={filters.testament}
              onChange={(e) => set({ testament: e.target.value, book: 'all' })}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground"
            >
              <option value="all" disabled={availability && !availability.testaments.all}>All (Old + New)</option>
              <option value="old" disabled={availability && !availability.testaments.old}>Old Testament</option>
              <option value="new" disabled={availability && !availability.testaments.new}>New Testament</option>
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs text-muted-foreground mb-1">Book</label>
            <select
              value={filters.book}
              onChange={(e) => set({ book: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground"
            >
              <option value="all" disabled={availability && !availability.books.all}>All books</option>
              {books.map(b => (
                <option
                  key={b.abbr}
                  value={b.apiName}
                  disabled={availability && availability.books[b.apiName] === false}
                >
                  {b.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block font-sans text-xs text-muted-foreground mb-1">Text contains (optional)</label>
          <input
            type="text"
            value={textDraft}
            onChange={(e) => onTextDraftChange(e.target.value)}
            placeholder="e.g. love LORD begat…"
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground"
          />
          <ul className="font-sans text-[11px] text-muted-foreground mt-1.5 leading-relaxed list-disc pl-4 space-y-1">
            <li>Separate terms with a <strong>space</strong> or a <strong>comma</strong> — both work the same way.</li>
            {filters.textAdjacent ? (
              <>
                <li>Terms must appear <strong>adjacent, as an exact phrase, in the order typed</strong>.</li>
                <li>Example: <span className="italic">love God</span> matches only where the words sit side by side.</li>
              </>
            ) : filters.textInOrder ? (
              <>
                <li>Each term is matched <strong>in the order typed</strong>, but any number of words may sit between them.</li>
                <li>Example: <span className="italic">love God</span> matches when “love” appears before “God”.</li>
              </>
            ) : (
              <>
                <li>Each term is matched <strong>independently, anywhere in the verse and in any order</strong>. A verse matches only when it contains <strong>every</strong> term.</li>
                <li>Example: <span className="italic">love, God</span> finds verses containing both, even if far apart.</li>
              </>
            )}
            {filters.textWildcard && (
              <li><strong>Wildcard</strong> mode: <span className="italic">*</span> matches any run of characters, <span className="italic">?</span> matches a single character. Example: <span className="italic">lov*</span> matches love, loved, lovely.</li>
            )}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 mt-2.5">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.textCaseSensitive}
                onChange={(e) => set({ textCaseSensitive: e.target.checked })}
                className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer"
              />
              <span className="font-sans text-xs text-foreground">Match case</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.textWholeWord}
                onChange={(e) => set({ textWholeWord: e.target.checked })}
                className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer"
              />
              <span className="font-sans text-xs text-foreground">Whole word</span>
            </label>
            <label className={`flex items-center gap-1.5 select-none ${filters.textAdjacent ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={filters.textAdjacent}
                checked={filters.textInOrder || filters.textAdjacent}
                onChange={(e) => set({ textInOrder: e.target.checked })}
                className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="font-sans text-xs text-foreground">In order</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.textAdjacent}
                onChange={(e) => set({ textAdjacent: e.target.checked })}
                className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer"
              />
              <span className="font-sans text-xs text-foreground">Adjacent (phrase)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.textWildcard}
                onChange={(e) => set({ textWildcard: e.target.checked })}
                className="w-3.5 h-3.5 accent-[hsl(var(--accent))] cursor-pointer"
              />
              <span className="font-sans text-xs text-foreground">Wildcard (* ?)</span>
            </label>
          </div>
        </div>
      </Section>

      {/* Sort */}
      <Section title="Sort by" icon={ArrowUpDown} open={openSections.sort} onToggle={() => toggleSection('sort')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={filters.sortKey}
            onChange={(e) => set({ sortKey: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground"
          >
            <option value="none">None (no sorting)</option>
            <option value="canonical">Book order (canonical)</option>
            {NUMERIC_METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <select
            value={filters.sortDir}
            onChange={(e) => set({ sortDir: e.target.value })}
            disabled={noSort}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground disabled:opacity-40"
          >
            {isCanonical ? (
              <>
                <option value="asc">Genesis → Revelation</option>
                <option value="desc">Revelation → Genesis</option>
              </>
            ) : (
              <>
                <option value="desc">Highest first</option>
                <option value="asc">Lowest first</option>
              </>
            )}
          </select>
        </div>
        {noSort && (
          <p className="font-sans text-xs text-muted-foreground -mt-1">Results stay in Bible order, unsorted.</p>
        )}
      </Section>

      {/* Numeric ranges */}
      <Section title="Numeric filters" open={openSections.numeric} onToggle={() => toggleSection('numeric')}>
        <p className="font-sans text-xs text-muted-foreground -mt-1">Leave blank for no limit.</p>
        <div className="space-y-2">
          {NUMERIC_METRICS.map(m => {
            const dr = metricRanges?.[m.key];
            // No matching verses for this metric (given other filters) and the
            // user hasn't set its own range → grey it out.
            const hasOwnValue = filters.ranges[m.key].min !== '' || filters.ranges[m.key].max !== '';
            const unavailable = metricRanges && dr === null && !hasOwnValue;
            return (
            <div key={m.key} className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 ${unavailable ? 'opacity-40' : ''}`}>
              <span className="font-sans text-xs text-foreground truncate">{m.label}</span>
              <input
                type="number"
                inputMode="numeric"
                disabled={unavailable}
                value={filters.ranges[m.key].min}
                onChange={(e) => setRange(m.key, 'min', e.target.value)}
                placeholder={dr ? String(dr.min) : 'min'}
                className="w-20 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground disabled:cursor-not-allowed"
              />
              <input
                type="number"
                inputMode="numeric"
                disabled={unavailable}
                value={filters.ranges[m.key].max}
                onChange={(e) => setRange(m.key, 'max', e.target.value)}
                placeholder={dr ? String(dr.max) : 'max'}
                className="w-20 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground disabled:cursor-not-allowed"
              />
            </div>
            );
          })}
        </div>
      </Section>

      {/* Boolean toggles */}
      <Section title="Property filters" open={openSections.property} onToggle={() => toggleSection('property')}>
        <div className="space-y-2.5">
          {BOOLEAN_METRICS.map(m => {
            const isActive = filters.bools[m.key] !== 'any';
            return (
            <div key={m.key} className={`flex items-center justify-between gap-3 rounded-lg px-2 -mx-2 py-1 transition-colors ${isActive ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
              <span className={`font-sans text-xs flex-1 ${isActive ? 'text-foreground font-semibold' : 'text-foreground'}`}>{m.label}</span>
              <div className="flex rounded-lg overflow-hidden border border-border shrink-0">
                {['any', 'yes', 'no'].map(opt => {
                  const active = filters.bools[m.key] === opt;
                  const unavailable = availability && !active && availability.bools[m.key]?.[opt] === false;
                  return (
                  <button
                    key={opt}
                    disabled={unavailable}
                    onClick={() => setBool(m.key, opt)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    } ${unavailable ? 'opacity-30 cursor-not-allowed hover:text-muted-foreground' : ''}`}
                  >
                    {opt === 'any' ? 'Any' : opt === 'yes' ? 'Yes' : 'No'}
                  </button>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </Section>

      <button
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary/50 border border-border text-foreground font-sans text-sm font-medium hover:border-accent transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset all filters
      </button>
    </div>
  );
}