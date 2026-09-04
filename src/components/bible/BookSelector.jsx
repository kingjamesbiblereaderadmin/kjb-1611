import React, { useState, useRef, useEffect } from 'react';
import { OLD_TESTAMENT, NEW_TESTAMENT } from '@/lib/bibleData';

export default function BookSelector({ currentAbbr, onSelect, onClose, initialTestament }) {
  const [tab, setTab] = useState(initialTestament === 'new' ? 'new' : 'old');
  const scrollRef = useRef(null);

  // Reset the book list to the top whenever the testament tab changes, so a
  // user scrolled deep into the Old Testament lands at the top of the New.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [tab]);

  const books = tab === 'new' ? NEW_TESTAMENT : OLD_TESTAMENT;
  const titleBook = tab === 'new'
    ? { abbr: 'MAT', name: 'Matthew', chapters: 28, shortName: 'Mat' }
    : { abbr: 'GEN', name: 'Genesis', chapters: 50, shortName: 'Gen' };

  const renderBook = (book) => {
    const active = book.abbr === currentAbbr;
    return (
      <button
        key={book.abbr}
        onClick={() => { onSelect(book, false, true); onClose(); }}
        className={`w-full text-left px-4 py-2.5 text-sm font-sans transition-colors border-b border-border/60 last:border-b-0 ${
          active
            ? 'bg-primary text-primary-foreground font-semibold'
            : 'hover:bg-accent/10 text-foreground'
        }`}
      >
        <span className="notranslate">{book.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">{book.chapters} ch.</span>
      </button>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden w-[95vw] max-w-md max-h-[70vh] flex flex-col relative">
      {/* Testament tabs */}
      <div className="grid grid-cols-2 gap-1 p-2 border-b border-border">
        <button
          onClick={() => setTab('old')}
          className={`py-2 rounded-lg font-sans text-sm font-semibold transition-colors ${
            tab === 'old'
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-accent/10'
          }`}
        >
          Old Testament
        </button>
        <button
          onClick={() => setTab('new')}
          className={`py-2 rounded-lg font-sans text-sm font-semibold transition-colors ${
            tab === 'new'
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-accent/10'
          }`}
        >
          New Testament
        </button>
      </div>

      <div ref={scrollRef} className="overflow-y-auto flex-1 pb-6 overscroll-contain">
        {/* Title Page for this testament */}
        <button
          onClick={() => { onSelect(titleBook, true, false); onClose(); }}
          className="w-full text-left px-4 py-3.5 text-sm font-serif transition-colors hover:bg-accent/10 font-medium text-foreground border-b border-border"
        >
          <span>Title Page</span>
        </button>
        <div className="flex flex-col">
          {books.map((book) => renderBook(book))}
        </div>
      </div>
    </div>
  );
}