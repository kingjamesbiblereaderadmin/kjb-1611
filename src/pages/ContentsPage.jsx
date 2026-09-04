import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, ChevronDown } from 'lucide-react';
import { BIBLE_BOOKS } from '@/lib/bibleData';
import { fetchVerseCount, resolveColophon, resolveSubscript } from '@/lib/bibleApi';
import BookSelector from '@/components/bible/BookSelector';
import ChapterSelector from '@/components/bible/ChapterSelector';
import VerseSelector from '@/components/bible/VerseSelector';
import NativeSelector from '@/components/bible/NativeSelector';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 640;

// Format verses with dashes for consecutive, commas for gaps
function formatVerses(verses) {
  if (!verses || verses.length === 0) return '';
  if (verses.length === 1) return String(verses[0]);
  
  const sorted = [...verses].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  
  return ranges.join(',');
}

export default function ContentsPage() {
  const navigate = useNavigate();
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showVerseSelector, setShowVerseSelector] = useState(false);
  
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedVerses, setSelectedVerses] = useState([]);
  const [verseCount, setVerseCount] = useState(0);

  const currentBook = selectedBook ? BIBLE_BOOKS.find(b => b.abbr === selectedBook) : null;

  const goTo = (abbr, chapter, verse = null) => {
    try { localStorage.setItem('kjb-position', JSON.stringify({ abbr, chapter, verse })); } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate('/read'), 150);
  };

  const handleSelectBook = (book, isTitlePage) => {
    if (isTitlePage) {
      setSelectedBook(book.abbr);
      setSelectedChapter(0);
      setSelectedVerses([]);
      setTimeout(() => goTo(book.abbr, 0, null), 150);
    } else {
      setSelectedBook(book.abbr);
      setSelectedChapter(null);
      setSelectedVerses([]);
      setShowBookSelector(false);
      setShowChapterSelector(true);
    }
  };

  const handleSelectChapter = (chapter, showVerseSelectorNext) => {
    setSelectedChapter(chapter);
    if (showVerseSelectorNext) {
      setShowChapterSelector(false);
      // Fetch verse count for selected chapter
      fetchVerseCount(currentBook.apiName, chapter).then(count => {
        setVerseCount(count);
        if (count > 0) {
          setShowVerseSelector(true);
        } else {
          setTimeout(() => goTo(selectedBook, chapter, null), 150);
        }
      });
    } else {
      // "Go to Chapter" — navigate straight to the chapter
      setShowChapterSelector(false);
      setTimeout(() => goTo(selectedBook, chapter, null), 150);
    }
  };

  const handleSelectVerse = (verses) => {
    // Special section picks (colophon/subscript) from the verse picker —
    // land on the last verse (colophon sits below it) or verse 1 (subscript
    // sits above it); the reader renders the full chapter either way.
    if (verses && typeof verses === 'object' && !Array.isArray(verses) && verses.section) {
      const v = verses.section === 'colophon' ? verseCount : 1;
      setShowVerseSelector(false);
      setTimeout(() => goTo(selectedBook, selectedChapter, [v]), 150);
      return;
    }
    const verseArray = Array.isArray(verses) ? verses : [verses];
    setSelectedVerses(verseArray);
    setShowVerseSelector(false);
    setTimeout(() => goTo(selectedBook, selectedChapter, verseArray), 150);
  };

  useEffect(() => {
    if (selectedBook && selectedChapter && selectedChapter > 0) {
      fetchVerseCount(currentBook.apiName, selectedChapter).then(count => {
        setVerseCount(count);
      });
    }
  }, [selectedBook, selectedChapter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-indigo-500/30 mb-4">
          <List className="w-7 h-7 text-white" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Table of Contents</h1>
        <p className="notranslate font-sans text-sm text-muted-foreground" translate="no">King James Bible — Pure Cambridge Edition</p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
      </div>

      {/* Selection Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowBookSelector(true)}
          className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-sans font-semibold text-sm hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between"
        >
          <span className="notranslate" translate="no">
            {selectedBook && selectedChapter 
              ? `${currentBook?.name} ${selectedChapter}${selectedVerses.length > 0 ? `:${formatVerses(selectedVerses)}` : ''}` 
              : 'Select a Book'}
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Book Selector Popup — native dropdowns on mobile, grid popup on desktop */}
      {showBookSelector && isMobile() && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onPointerDown={(e) => { if (e.target === e.currentTarget) setShowBookSelector(false); }}
        >
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5">
            <p className="font-serif text-lg font-semibold text-foreground text-center mb-4">Go to Passage</p>
            <NativeSelector
              initialAbbr={selectedBook || 'GEN'}
              initialChapter={selectedChapter && selectedChapter > 0 ? selectedChapter : 1}
              onGo={(abbr, chapter, verse) => {
                setShowBookSelector(false);
                goTo(abbr, chapter, verse ? [verse] : null);
              }}
            />
          </div>
        </div>
      )}
      {showBookSelector && !isMobile() && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-24 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBookSelector(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <BookSelector
              currentAbbr={selectedBook}
              onSelect={handleSelectBook}
              onClose={() => setShowBookSelector(false)}
            />
          </div>
        </div>
      )}

      {/* Chapter Selector Popup */}
      {showChapterSelector && currentBook && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setShowChapterSelector(false);
            setSelectedBook(null);
            setSelectedChapter(null);
          }}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <ChapterSelector
              totalChapters={currentBook.chapters}
              currentChapter={selectedChapter}
              onSelect={handleSelectChapter}
              bookName={currentBook.name}
              onClose={() => {
                setShowChapterSelector(false);
                setSelectedBook(null);
                setSelectedChapter(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Verse Selector Popup */}
      {showVerseSelector && verseCount > 0 && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowVerseSelector(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <VerseSelector
              totalVerses={verseCount}
              currentVerse={selectedVerses}
              onSelect={handleSelectVerse}
              onClose={() => setShowVerseSelector(false)}
              onGoToChapter={() => {
                setShowVerseSelector(false);
                goTo(selectedBook, selectedChapter, null);
              }}
              multiSelect={true}
              hasSubscript={currentBook ? !!resolveSubscript(currentBook.apiName, selectedChapter) : false}
              hasColophon={currentBook ? !!resolveColophon(currentBook.apiName, selectedChapter) : false}
            />
          </div>
        </div>
      )}

      <p className="text-center font-sans text-xs text-muted-foreground">
        Tap "Select a Book" to choose a book, chapter, and verse
      </p>
    </div>
    </div>
  );
}