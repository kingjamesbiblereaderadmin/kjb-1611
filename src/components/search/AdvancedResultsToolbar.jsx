import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, Copy, Check, ChevronDown, FileText, FileType, Table, FileDown } from 'lucide-react';
import { exportVerses } from '@/lib/exportVerses';
import { mergeAdjacentBrackets } from '@/lib/bibleApi';
import { describeFilters } from '@/lib/describeFilters';
import { getPublicOrigin } from '@/lib/publicOrigin';
import { toast } from 'sonner';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

// Build the public reader URL for a record so exports can link back to it.
function recordUrl(r) {
  try {
    const origin = getPublicOrigin().replace(/^https?:\/\/preview-sandbox--/, 'https://');
    return `${origin}/read?book=${r.abbr}&chapter=${r.chapter}&verse=${r.verse}`;
  } catch {
    return '';
  }
}

// Map an Advanced Search record to the item shape exportVerses expects.
function toExportItem(r) {
  return {
    ref: r.ref,
    book: r.shortName,
    bookName: r.shortName,
    testament: r.testament,
    verse: r.verse,
    text: r.rawText,
    url: recordUrl(r),
  };
}

// Plain-text (no brackets, no pilcrow) for clipboard copy.
function plainForCopy(text) {
  return mergeAdjacentBrackets(text || '')
    .replace(/¶\s*/g, '')
    .replace(/\[([^\]]*)\]/g, '$1')
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a short, filename-safe suffix describing the active advanced-search
// filters (testament, book, match mode/options, numeric ranges, booleans,
// sort). The search text itself is already the export "query" (first part of
// the filename), so it's not duplicated here.
function buildFilenameSuffix(filters) {
  if (!filters) return '';
  const parts = [];
  if (filters.testament === 'old') parts.push('OT');
  else if (filters.testament === 'new') parts.push('NT');
  if (filters.book && filters.book !== 'all') parts.push(filters.book);
  if (filters.textAdjacent) parts.push('phrase');
  else if (filters.textInOrder) parts.push('inorder');
  if (filters.textWholeWord) parts.push('wholeword');
  if (filters.textCaseSensitive) parts.push('matchcase');
  if (filters.ranges) {
    for (const [key, r] of Object.entries(filters.ranges)) {
      if (!r) continue;
      const hasMin = r.min !== '' && r.min != null;
      const hasMax = r.max !== '' && r.max != null;
      if (hasMin && hasMax) parts.push(`${key}-${r.min}-${r.max}`);
      else if (hasMin) parts.push(`${key}-min${r.min}`);
      else if (hasMax) parts.push(`${key}-max${r.max}`);
    }
  }
  if (filters.bools) {
    for (const [key, val] of Object.entries(filters.bools)) {
      if (val && val !== 'any') parts.push(`${key}-${val}`);
    }
  }
  if (filters.sortKey && filters.sortKey !== 'none' && filters.sortKey !== 'canonical') {
    parts.push(`sort-${filters.sortKey}-${filters.sortDir || 'asc'}`);
  }
  const slug = parts.join('-').replace(/[^a-zA-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return slug ? `-${slug}` : '';
}

const FORMATS = [
  { key: 'pdf', label: 'PDF', icon: FileDown },
  { key: 'docx', label: 'Word (.doc)', icon: FileType },
  { key: 'xls', label: 'CSV / Excel', icon: Table },
  { key: 'txt', label: 'Plain text', icon: FileText },
];

// Toolbar for Advanced Search results: export (PDF/Word/CSV/TXT), print, and
// copy. When `selectedRecords` is provided (select mode), it acts on those;
// otherwise it acts on all `records`.
export default function AdvancedResultsToolbar({ records, selectedRecords, filters }) {
  const active = (selectedRecords && selectedRecords.length > 0) ? selectedRecords : records;
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // Use the actual search text as the export "query" (so it's shown and
  // highlighted); fall back to a generic label when no text was entered.
  const searchText = (filters?.textContains || '').trim();
  const query = searchText || 'Advanced-Search';
  const items = active.map(toExportItem);
  const filterSummary = describeFilters(filters);
  const filenameSuffix = buildFilenameSuffix(filters);
  const exportOptions = { titlePrefix: 'KJB Advanced Search', filterSummary, filenameSuffix, showQuery: !!searchText };

  // The exporter's highlighter reads `filters.caseSensitive` / `filters.wholeWord`
  // and treats commas / quotes specially. Advanced Search stores these under
  // different names (textCaseSensitive / textWholeWord) and separates terms by
  // spaces or commas. Build a query + filters pair the highlighter understands
  // so the highlighted words in exports match what actually searched.
  const buildHighlight = () => {
    if (!searchText) return { hlQuery: query, hlFilters: filters };
    const terms = searchText.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
    // Adjacent = exact phrase → quote it so the highlighter matches the whole phrase.
    if (filters.textAdjacent) {
      return {
        hlQuery: `"${terms.join(' ')}"`,
        hlFilters: { ...filters, caseSensitive: filters.textCaseSensitive, wholeWord: filters.textWholeWord },
      };
    }
    // Otherwise highlight each term independently (comma-separated for the highlighter).
    return {
      hlQuery: terms.join(', '),
      hlFilters: { ...filters, caseSensitive: filters.textCaseSensitive, wholeWord: filters.textWholeWord },
    };
  };

  const doExport = (format) => {
    setMenuOpen(false);
    if (!items.length) return;
    const { hlQuery, hlFilters } = buildHighlight();
    // Keep the title clean ("KJB Advanced Search") — the exact search text is
    // already shown in the Applied Filters block, so don't append the
    // comma/quote-normalised highlight query to the heading.
    exportVerses(format, items, hlQuery, hlFilters, { ...exportOptions, showQuery: false })
      .then(() => toast.success(isNativeAndroid() ? 'Saved to your Downloads folder!' : 'File downloaded successfully!'))
      .catch((err) => { console.error('Export failed:', err); toast.error('Export failed. Please try again.'); });
  };

  const doPrint = () => {
    if (!items.length) return;
    const { hlQuery, hlFilters } = buildHighlight();
    exportVerses('print', items, hlQuery, hlFilters, { ...exportOptions, showQuery: false }).catch((err) => console.error('Print failed:', err));
  };

  const doCopy = async () => {
    if (!active.length) return;
    const text = active.map(r => `${r.ref} (KJB)\n"${plainForCopy(r.rawText)}"`).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
      document.body.removeChild(ta);
    }
  };

  const count = active.length;
  const disabled = count === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Export dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/60 border border-border text-foreground text-sm font-medium hover:border-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download className="w-4 h-4" />
          Export
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-30 mt-1 w-48 max-w-[calc(100vw-1.5rem)] rounded-xl bg-popover border border-border shadow-xl overflow-hidden">
            {FORMATS.map(f => (
              <button
                key={f.key}
                onClick={() => doExport(f.key)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-popover-foreground hover:bg-secondary transition-colors"
              >
                <f.icon className="w-4 h-4 text-muted-foreground" />
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Print */}
      <button
        onClick={doPrint}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/60 border border-border text-foreground text-sm font-medium hover:border-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>

      {/* Copy */}
      <button
        onClick={doCopy}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/60 border border-border text-foreground text-sm font-medium hover:border-accent transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy'}
      </button>

      {selectedRecords && selectedRecords.length > 0 && (
        <span className="font-sans text-xs text-muted-foreground ml-1">
          {selectedRecords.length} selected
        </span>
      )}
    </div>
  );
}