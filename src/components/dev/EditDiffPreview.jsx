import React from 'react';
import { diffWords } from '@/lib/textDiff';

// Shows a live word-level highlight of what changed between the original verse
// text and the current edited value. Added words are green, removed words are
// struck through in red. Only rendered while there are unsaved changes.
export default function EditDiffPreview({ original, current }) {
  const segments = diffWords(original || '', current || '');
  return (
    <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-2.5">
      <p className="font-sans text-[11px] font-semibold text-muted-foreground mb-1">Changes</p>
      <p className="font-serif text-sm leading-relaxed text-foreground break-words">
        {segments.map((seg, i) => {
          if (seg.type === 'added') {
            return (
              <span key={i} className="rounded bg-green-500/25 text-green-700 dark:text-green-300 px-0.5">
                {seg.value}
              </span>
            );
          }
          if (seg.type === 'removed') {
            return (
              <span key={i} className="rounded bg-red-500/20 text-red-700 dark:text-red-300 line-through px-0.5">
                {seg.value}
              </span>
            );
          }
          return <span key={i}>{seg.value}</span>;
        })}
      </p>
    </div>
  );
}