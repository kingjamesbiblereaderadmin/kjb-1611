import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BIBLE_BOOKS } from '@/lib/bibleData';
import { fetchChapter, resolveSubscript, resolveColophon, resolveEndMarker } from '@/lib/bibleApi';
import { invalidateOverrides, loadOverrides, SUBSCRIPT_VERSE, COLOPHON_VERSE, END_MARKER_VERSE, headingKeyVerse } from '@/lib/bibleTextOverrides';
import { SUBSCRIPTS, COLOPHONS } from '@/lib/bibleSubscripts';
import { Loader2, Save, Trash2, RotateCcw } from 'lucide-react';
import BibleEditsLog from '@/components/dev/BibleEditsLog';
import EditDiffPreview from '@/components/dev/EditDiffPreview';

const DEV_KEY = 'KJB-DEV-2026';

// Admin editor for shared, database-backed verse corrections. Loads a chapter,
// lets you edit any verse's text, and saves it to the BibleTextOverride entity
// so all readers see the fix (no credits — fetchChapter applies overrides).
export default function BibleTextEditor() {
  const [book, setBook] = useState('Genesis');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState([]);
  const [edited, setEdited] = useState({});   // verseNum -> text
  const [editedHeading, setEditedHeading] = useState({}); // verseNum -> heading text
  const [overrides, setOverrides] = useState({}); // verseNum -> override row
  const [headingOverrides, setHeadingOverrides] = useState({}); // verseNum -> heading override row
  const [loading, setLoading] = useState(false);
  const [savingV, setSavingV] = useState(null);
  const [msg, setMsg] = useState('');
  const [logKey, setLogKey] = useState(0);   // bump to reload the edits log

  const bookEntry = BIBLE_BOOKS.find(b => b.apiName === book);
  const maxChapters = bookEntry ? bookEntry.chapters : 150;

  const load = async () => {
    setLoading(true);
    setMsg('');
    try {
      // Existing overrides for this chapter
      const rows = await base44.entities.BibleTextOverride.filter({ book, chapter: Number(chapter) });
      const ovMap = {};
      const headMap = {};
      rows.forEach(r => {
        // Heading overrides are stored under a high verse-number offset (1000+).
        if (r.verse >= 1000) headMap[r.verse - 1000] = r;
        else ovMap[r.verse] = r;
      });
      setOverrides(ovMap);
      setHeadingOverrides(headMap);
      // Chapter verses (already has overrides applied by fetchChapter)
      const { verses: vs } = await fetchChapter(book, Number(chapter));
      // Prepend the Psalm superscription (verse 0) and append the epistle
      // colophon (verse -1) as editable pseudo-verses, when present — resolving
      // any override so the editor shows the live text.
      const sub = resolveSubscript(book, Number(chapter));
      const col = resolveColophon(book, Number(chapter));
      const end = resolveEndMarker(book, Number(chapter));
      const combined = [
        ...(sub != null ? [{ verse: SUBSCRIPT_VERSE, text: sub, kind: 'subscript' }] : []),
        ...vs,
        ...(col != null ? [{ verse: COLOPHON_VERSE, text: col, kind: 'colophon' }] : []),
        ...(end != null ? [{ verse: END_MARKER_VERSE, text: end, kind: 'endmarker' }] : []),
      ];
      setVerses(combined);
      setEdited({});
      setEditedHeading({});
    } catch (err) {
      setMsg(err.message || 'Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [book, chapter]);

  const saveVerse = async (verseNum, text) => {
    setSavingV(verseNum);
    setMsg('');
    try {
      const existing = overrides[verseNum];
      if (existing) {
        await base44.functions.invoke('saveBibleTextOverride', { op: 'update', id: existing.id, text, key: DEV_KEY });
      } else {
        const res = await base44.functions.invoke('saveBibleTextOverride', { op: 'create', book, chapter: Number(chapter), verse: verseNum, text, key: DEV_KEY });
        const created = res?.data?.record;
        if (created) setOverrides(prev => ({ ...prev, [verseNum]: created }));
      }
      invalidateOverrides();
      await loadOverrides(true);
      setMsg(`Saved ${bookEntry?.shortName} ${chapter}:${verseNum} — live for all readers.`);
      setEdited(prev => { const n = { ...prev }; delete n[verseNum]; return n; });
      setLogKey(k => k + 1);
    } catch (err) {
      setMsg('Save failed: ' + (err.message || 'unknown'));
    }
    setSavingV(null);
  };

  // Save a Psalm 119 Hebrew-letter heading for a verse. Stored as an override
  // under the verse's heading-offset key so the reader picks it up.
  const saveHeading = async (verseNum, headingText) => {
    const headVerse = headingKeyVerse(verseNum);
    setSavingV(headVerse);
    setMsg('');
    try {
      const existing = headingOverrides[verseNum];
      if (existing) {
        await base44.functions.invoke('saveBibleTextOverride', { op: 'update', id: existing.id, text: headingText, key: DEV_KEY });
      } else {
        const res = await base44.functions.invoke('saveBibleTextOverride', { op: 'create', book, chapter: Number(chapter), verse: headVerse, text: headingText, key: DEV_KEY });
        const created = res?.data?.record;
        if (created) setHeadingOverrides(prev => ({ ...prev, [verseNum]: created }));
      }
      invalidateOverrides();
      await loadOverrides(true);
      setMsg(`Saved heading for ${bookEntry?.shortName} ${chapter}:${verseNum} — live for all readers.`);
      setEditedHeading(prev => { const n = { ...prev }; delete n[verseNum]; return n; });
      setLogKey(k => k + 1);
    } catch (err) {
      setMsg('Heading save failed: ' + (err.message || 'unknown'));
    }
    setSavingV(null);
  };

  const revertVerse = async (verseNum) => {
    const existing = overrides[verseNum];
    if (!existing) return;
    if (!confirm(`Remove the override for ${bookEntry?.shortName} ${chapter}:${verseNum}? The original text will be restored for everyone.`)) return;
    setSavingV(verseNum);
    try {
      await base44.functions.invoke('saveBibleTextOverride', { op: 'delete', id: existing.id, key: DEV_KEY });
      setOverrides(prev => { const n = { ...prev }; delete n[verseNum]; return n; });
      invalidateOverrides();
      await loadOverrides(true);
      await load();
      setLogKey(k => k + 1);
      setMsg(`Reverted ${bookEntry?.shortName} ${chapter}:${verseNum} to original.`);
    } catch (err) {
      setMsg('Revert failed: ' + (err.message || 'unknown'));
    }
    setSavingV(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-sans text-xs text-muted-foreground mb-1">Book</label>
            <select value={book} onChange={(e) => { setBook(e.target.value); setChapter(1); }}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground">
              {BIBLE_BOOKS.map(b => <option key={b.abbr} value={b.apiName}>{b.shortName}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-sans text-xs text-muted-foreground mb-1">Chapter</label>
            <select value={chapter} onChange={(e) => setChapter(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground">
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(ch => (
                <option key={ch} value={ch}>Chapter {ch}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Use [brackets] for italic (supplied) words. Saved edits apply to every reader instantly and cost no credits. Psalm superscriptions/subscripts and epistle colophons are editable here too. In Psalm 119, each stanza's Hebrew-letter heading (ALEPH, BETH, …) shows its own editable field above the verse it precedes (verses 1, 9, 17…).</p>
        {msg && <p className="text-xs text-primary">{msg}</p>}
      </div>

      <BibleEditsLog
        key={logKey}
        onJump={(b, ch) => { setBook(b); setChapter(Number(ch)); }}
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary/70" /></div>
      ) : (
        <div className="space-y-3">
          {verses.map(v => {
            const isOverridden = !!overrides[v.verse];
            const value = edited[v.verse] != null ? edited[v.verse] : v.text;
            const dirty = edited[v.verse] != null && edited[v.verse] !== v.text;
            // Psalm 119 Hebrew-letter heading: editable when this verse has one
            // (or already has a heading override saved).
            const hasHeading = v.heading != null || !!headingOverrides[v.verse];
            const headingCurrent = v.heading || '';
            const headingValue = editedHeading[v.verse] != null ? editedHeading[v.verse] : headingCurrent;
            const headingDirty = editedHeading[v.verse] != null && editedHeading[v.verse] !== headingCurrent;
            const headingSaving = savingV === headingKeyVerse(v.verse);
            return (
              <div key={v.verse} className={`rounded-xl border p-3 ${isOverridden ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-sans text-xs font-semibold text-accent">
                    {v.kind === 'subscript'
                      ? `${bookEntry?.shortName} ${chapter} — Superscription/Subscript`
                      : v.kind === 'colophon'
                        ? `${bookEntry?.shortName} ${chapter} — Colophon`
                        : v.kind === 'endmarker'
                          ? `${bookEntry?.shortName} ${chapter} — End Marker`
                          : `${bookEntry?.shortName} ${chapter}:${v.verse}`}
                    {' '}{isOverridden && <span className="text-primary">(overridden)</span>}
                  </span>
                  <div className="flex gap-1.5">
                    {isOverridden && (
                      <button onClick={() => revertVerse(v.verse)} disabled={savingV === v.verse}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-destructive text-xs hover:bg-destructive/10">
                        <RotateCcw className="w-3 h-3" /> Revert
                      </button>
                    )}
                    <button onClick={() => saveVerse(v.verse, value)} disabled={savingV === v.verse || !dirty}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-40">
                      {savingV === v.verse ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </button>
                  </div>
                </div>
                {hasHeading && (
                  <div className="mb-2 rounded-lg border border-accent/40 bg-accent/5 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans text-[11px] font-semibold text-accent">Hebrew-letter heading (above this verse)</span>
                      <button
                        onClick={() => saveHeading(v.verse, headingValue)}
                        disabled={headingSaving || !headingDirty}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent text-accent-foreground text-[11px] hover:opacity-90 disabled:opacity-40"
                      >
                        {headingSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save heading
                      </button>
                    </div>
                    <input
                      type="text"
                      value={headingValue}
                      onChange={(e) => setEditedHeading(prev => ({ ...prev, [v.verse]: e.target.value }))}
                      placeholder="e.g. ALEPH"
                      className="w-full px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm font-serif text-foreground uppercase"
                    />
                    {headingDirty && <EditDiffPreview original={headingCurrent} current={headingValue} />}
                  </div>
                )}
                <textarea
                  value={value}
                  onChange={(e) => setEdited(prev => ({ ...prev, [v.verse]: e.target.value }))}
                  rows={Math.max(2, Math.ceil(value.length / 80))}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm font-serif text-foreground resize-y"
                />
                {dirty && <EditDiffPreview original={v.text} current={value} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}