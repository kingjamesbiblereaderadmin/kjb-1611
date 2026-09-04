import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { BIBLE_BOOKS, OLD_TESTAMENT, NEW_TESTAMENT } from '@/lib/bibleData';
import { fetchVerseCount, resolveColophon, resolveSubscript } from '@/lib/bibleApi';
import FieldDropdown from '@/components/bible/FieldDropdown';

export default function NativeSelector({ initialAbbr = 'GEN', initialChapter = 1, onGo }) {
  const [abbr, setAbbr] = useState(initialAbbr);
  const [chapter, setChapter] = useState(initialChapter || 1);
  const [verse, setVerse] = useState(''); // '' = whole chapter
  const [verseCount, setVerseCount] = useState(0);
  const [loadingVerses, setLoadingVerses] = useState(false);

  const book = BIBLE_BOOKS.find(b => b.abbr === abbr) || BIBLE_BOOKS[0];
  const maxChapters = book.chapters;
  const hasColophon = !!resolveColophon(book.apiName, chapter);
  const hasSubscript = !!resolveSubscript(book.apiName, chapter);

  // Determine which testament the current book belongs to.
  const initialTestament = useMemo(
    () => (NEW_TESTAMENT.some(b => b.abbr === initialAbbr) ? 'new' : 'old'),
    [initialAbbr]
  );
  const [testament, setTestament] = useState(initialTestament);

  // Books for the currently selected testament.
  const bookList = testament === 'new' ? NEW_TESTAMENT : OLD_TESTAMENT;

  // Fetch verse count whenever book/chapter changes so the verse dropdown fills.
  useEffect(() => {
    let cancelled = false;
    setLoadingVerses(true);
    setVerseCount(0);
    fetchVerseCount(book.apiName, chapter)
      .then(count => { if (!cancelled) setVerseCount(count || 0); })
      .catch(() => { if (!cancelled) setVerseCount(0); })
      .finally(() => { if (!cancelled) setLoadingVerses(false); });
    return () => { cancelled = true; };
  }, [book.apiName, chapter]);

  const handleTestament = (newTestament) => {
    setTestament(newTestament);
    const firstBook = newTestament === 'new' ? NEW_TESTAMENT[0] : OLD_TESTAMENT[0];
    setAbbr(firstBook.abbr);
    setChapter(1);
    setVerse('');
  };

  const handleBook = (newAbbr) => {
    setAbbr(newAbbr);
    setChapter(1);
    setVerse('');
  };

  const handleChapter = (ch) => {
    setChapter(Number(ch));
    setVerse('');
  };

  const handleGo = () => {
    let v = verse;
    if (v === 'colophon') v = String(verseCount); // colophon sits after the last verse
    else if (v === 'subscript') v = '1';          // superscription sits above verse 1
    onGo(abbr, chapter, v === '' ? null : Number(v));
  };

  return (
    <div className="space-y-3 p-1">
      <FieldDropdown
        label="Testament"
        value={testament}
        options={[{ value: 'old', label: 'Old Testament' }, { value: 'new', label: 'New Testament' }]}
        onSelect={handleTestament}
      />

      <FieldDropdown
        label="Book"
        value={abbr}
        options={bookList.map(b => ({ value: b.abbr, label: b.name }))}
        onSelect={handleBook}
        small
      />

      <div className="grid grid-cols-2 gap-3">
        <FieldDropdown
          label="Chapter"
          value={chapter}
          options={Array.from({ length: maxChapters }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
          onSelect={handleChapter}
        />
        <FieldDropdown
          label="Verse"
          value={verse}
          options={[
            { value: '', label: 'Whole chapter' },
            ...(hasSubscript ? [{ value: 'subscript', label: 'Subscript' }] : []),
            ...Array.from({ length: verseCount }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
            ...(hasColophon ? [{ value: 'colophon', label: 'Colophon' }] : []),
          ]}
          onSelect={(v) => setVerse(String(v))}
          disabled={loadingVerses || verseCount === 0}
        />
      </div>

      <button
        onClick={handleGo}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-opacity"
      >
        {loadingVerses ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <>Go to {book.shortName} {chapter}{verse === 'colophon' ? "'s Colophon" : verse === 'subscript' ? "'s Subscript" : verse !== '' ? `:${verse}` : ''} <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}