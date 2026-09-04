import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { BIBLE_BOOKS } from '@/lib/bibleData';
import { invalidateOverrides, loadOverrides, SUBSCRIPT_VERSE, COLOPHON_VERSE } from '@/lib/bibleTextOverrides';
import { Loader2, RotateCcw, ListChecks } from 'lucide-react';

const DEV_KEY = 'KJB-DEV-2026';

const shortName = (apiName) => BIBLE_BOOKS.find(b => b.apiName === apiName)?.shortName || apiName;

const refLabel = (r) => {
  const name = shortName(r.book);
  if (r.verse === SUBSCRIPT_VERSE) return `${name} ${r.chapter} — Superscription/Subscript`;
  if (r.verse === COLOPHON_VERSE) return `${name} ${r.chapter} — Colophon`;
  return `${name} ${r.chapter}:${r.verse}`;
};

// Read-only log of every saved Bible text override (your edits), newest first.
// Each entry shows what was changed plus a Revert button to restore the original.
export default function BibleEditsLog({ onJump }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.BibleTextOverride.list('-updated_date', 1000);
      setRows(list);
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const revert = async (r) => {
    if (!confirm(`Remove the override for ${refLabel(r)}? The original text will be restored for everyone.`)) return;
    setBusyId(r.id);
    try {
      await base44.functions.invoke('saveBibleTextOverride', { op: 'delete', id: r.id, key: DEV_KEY });
      invalidateOverrides();
      await loadOverrides(true);
      await load();
    } catch (err) {
      alert('Revert failed: ' + (err.message || 'unknown'));
    }
    setBusyId(null);
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <ListChecks className="w-4 h-4 text-primary" />
        <span className="font-sans text-sm font-semibold text-foreground">Your edits ({rows.length})</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary/70" /></div>
      ) : rows.length === 0 ? (
        <p className="font-sans text-xs text-muted-foreground px-4 py-4">No edits yet. Corrections you save will be listed here.</p>
      ) : (
        <div>
          {rows.map(r => (
            <div key={r.id} className="px-4 py-3 border-b border-border last:border-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <button
                  onClick={() => onJump && onJump(r.book, r.chapter)}
                  className="font-sans text-xs font-semibold text-accent hover:underline text-left">
                  {refLabel(r)}
                </button>
                <button onClick={() => revert(r)} disabled={busyId === r.id}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-destructive text-xs hover:bg-destructive/10 shrink-0">
                  {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />} Revert
                </button>
              </div>
              {r.note && <p className="font-sans text-[11px] text-muted-foreground mb-1">Note: {r.note}</p>}
              <p className="font-serif text-sm text-foreground leading-snug">{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}