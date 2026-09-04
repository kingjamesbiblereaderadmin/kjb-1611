import { useEffect, useRef } from 'react';
import { recordReadingProgress } from '@/lib/readingProgress';

// Records reading progress to the cloud whenever the user opens a chapter.
// Fires once per chapter load (not on every verse change within the same chapter).
export function useReadingProgressTracker(pos, loading) {
  const lastTrackedRef = useRef('');

  useEffect(() => {
    if (loading) return;
    if (!pos?.abbr || !pos?.chapter || pos.chapter === 0) return;

    const key = `${pos.abbr}:${pos.chapter}`;
    // Only track when the chapter actually changes — not on every verse scroll
    // within the same chapter.
    if (key === lastTrackedRef.current) return;
    lastTrackedRef.current = key;

    recordReadingProgress(pos.abbr, pos.chapter);
  }, [pos?.abbr, pos?.chapter, loading]);
}