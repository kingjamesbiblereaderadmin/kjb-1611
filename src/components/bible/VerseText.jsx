import React, { useState, useEffect } from 'react';
import { renderVerseText } from '@/lib/bibleApi';
import { Copy, Share2, X, Highlighter, ChevronDown, Bookmark, BookmarkCheck, CheckSquare, Square } from 'lucide-react';
import { isVerseSaved, saveVerse, removeSavedVerse } from '@/lib/savedVerses';
import { getVerseHighlight, setVerseHighlight, removeVerseHighlight } from '@/lib/verseHighlights';
import { HIGHLIGHT_COLORS } from '@/lib/highlightColors';
import { BIBLE_BOOKS } from '@/lib/bibleData';
import { formatVerseShare, buildVerseUrl } from '@/lib/formatDailyVerse';
import { nativeShare } from '@/lib/nativeShare';
import VersePopover from '@/components/bible/VersePopover';
import SaveFolderPicker from '@/components/bible/SaveFolderPicker';

export default function VerseText({ verse, highlight = false, id, bookName, abbr, chapter, isFirstVerse = false, paragraphMode = false, selectMode = false, highlightMode = false, activeHighlightColor = null, isSelected = false, onSelect, onActivateSelect, totalVerses = 0, colophon = null, subscript = null, isCursive = false, fontFamilyValue = null, zoomLevel = 100, hasSubscript = false, searchTerm = null, dropCap = false, columnMode = false, onVerseTap = null, isDirectJump = false }) {
  const bookEntry = BIBLE_BOOKS.find(b => b.abbr === abbr);
  const shortBookName = bookEntry ? bookEntry.shortName : bookName;
  const [selected, setSelected] = useState(false);
  // The persisted highlighter colour is read fresh on every render (never
  // cached in local state) so it can't get stuck stale — a stored boolean
  // here previously kept showing "highlighted" for verses after the tapped
  // verse changed. A tick counter forces a re-render when storage changes.
  const [, forceHighlightSync] = useState(0);
  useEffect(() => {
    const sync = () => forceHighlightSync(n => n + 1);
    window.addEventListener('kjb-highlights-changed', sync);
    return () => window.removeEventListener('kjb-highlights-changed', sync);
  }, []);
  const persistedColor = getVerseHighlight(abbr, chapter, verse.verse);
  const showHighlight = !!persistedColor;

  const [highlightColor, setHighlightColor] = useState(() => getVerseHighlight(abbr, chapter, verse.verse) || 'yellow');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saved, setSaved] = useState(() => isVerseSaved(abbr, chapter, verse.verse));
  const [currentText, setCurrentText] = useState(verse.text);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [clickPos, setClickPos] = useState(null);

  useEffect(() => {
    setCurrentText(verse.text);
  }, [verse.text]);

  useEffect(() => {
    const handleUpdate = async () => {
      try {
        const { fetchChapter } = await import('@/lib/bibleApi');
        const bookEntry = BIBLE_BOOKS.find(b => b.abbr === abbr);
        if (!bookEntry) return;
        const data = await fetchChapter(bookEntry.apiName, chapter);
        const updatedVerse = data.verses.find(v => v.verse === verse.verse);
        if (updatedVerse && updatedVerse.text !== currentText) {
          setCurrentText(updatedVerse.text);
        }
      } catch (err) {
        console.error('Failed to update verse silently:', err);
      }
    };
    window.addEventListener('kjb-cache-updated', handleUpdate);
    return () => window.removeEventListener('kjb-cache-updated', handleUpdate);
  }, [abbr, chapter, verse.verse, currentText]);



  const highlightColors = HIGHLIGHT_COLORS;

  // Intentionally no auto-highlight on navigation — the reader scrolls to the
  // verse; the highlight overlay only appears when the user taps and applies it.

  // Strip <<...>> superscription markers
  let displayVerseText = currentText.replace(/^<<[^>]*>>\s*/, '');

  // renderVerseText handles [italics] and ¶ pilcrow styling, plus search term highlighting
  let html = renderVerseText(displayVerseText, searchTerm);

  // Shared click handler: toggles the verse action menu (selects in select
  // mode, or applies/removes the highlighter directly in highlight mode).
  const handleVerseClick = (e) => {
    if (selectMode) { onSelect?.(verse.verse); return; }
    if (highlightMode) {
      if (showHighlight) {
        removeVerseHighlight(abbr, chapter, verse.verse);
      } else {
        const colorToApply = activeHighlightColor || highlightColor;
        setHighlightColor(colorToApply);
        setVerseHighlight(abbr, chapter, verse.verse, colorToApply);
      }
      return;
    }
    if (onVerseTap) { onVerseTap(verse.verse); return; }
    setClickPos({ x: e.clientX, y: e.clientY });
    setSelected((s) => !s);
  };

  // Drop cap: wrap the FIRST visible letter of the text in a styled span (instead
  // of CSS ::first-letter, which doesn't work reliably in inline/paragraph flow
  // and would otherwise enlarge the verse number). Skips any leading HTML tags
  // (e.g. a pilcrow span) so the cap lands on the first real letter.
  if (dropCap && !selectMode) {
    // Float the verse number + big first letter together as one unit, so the
    // number always sits immediately to the LEFT of the drop cap (in every mode).
    // When highlighted, tint the big letter with the active highlight colour so
    // the highlight visually covers it (the float sits outside the parent's
    // inline background box, so it needs its own background).
    // The floated drop-cap letter always sits OUTSIDE the inline highlight box
    // (in every mode), so it needs its own tint to show the highlight.
    // The verse number always stays clear (kjb-dropcap-num is transparent in CSS).
    // `highlight` is a broad "this verse is relevant to the current
    // navigation" flag -- true both for a genuine direct verse jump (e.g. a
    // cross-reference link, or a specific search RESULT you paged to) AND for
    // a full-chapter search view where THIS verse merely contains a match
    // somewhere. In the second case, the match is often NOT the first word --
    // but `highlight` alone doesn't distinguish that, so the drop cap's tint
    // was either applying too broadly (any match anywhere in the chapter) or,
    // after tightening it to `dropCapIsActualMatch`, not applying at all to a
    // genuine single-verse search-result jump when the matched term wasn't
    // the verse's first word (e.g. paging to a specific result highlights the
    // whole verse, but the drop cap stayed untinted because `searchTerm` was
    // still set). `isDirectJump` disambiguates: BibleReader passes it true
    // only when THIS verse is the actual `highlightVerse` target (a real
    // jump), not just a member of the broader `highlightedVerses` set used
    // for chapter-wide search scanning.
    const dropCapIsActualMatch = /^(?:<[^>]+>|\s)*<mark\b/.test(html);
    const needsOwnTint = showHighlight || (highlight && (isDirectJump || !searchTerm || dropCapIsActualMatch));
    const dropRaw = needsOwnTint
      ? highlightColors.find(c => c.name === (persistedColor || highlightColor))?.color
      : null;
    const dropHighlight = dropRaw
      ? (dropRaw.startsWith('#') ? `${dropRaw}99` : `hsl(var(--accent) / 0.6)`)
      : null;
    const letterStyle = dropHighlight
      ? ` style="background-color:${dropHighlight};border-radius:0.1em;"`
      : '';
    // When the letter carries its own tint, mask the inline highlight behind the
    // float with the page background so the two layers don't stack into a
    // darker box. The number cell stays transparent (only the letter is masked).
    const groupStyle = dropHighlight
      ? ` style="background-color:hsl(var(--background));"`
      : '';
    // Match the first letter that is part of the actual TEXT, skipping any
    // leading HTML tags (e.g. <em>, <span class="pilcrow">). Using a bare
    // /[A-Za-z]/ would match the "e" inside a leading "<em>" tag and break it
    // into a stray "<m>" — so we capture any leading tags and re-emit them.
    // Line/column mode renders the verse number as a normal sup in the gutter
    // (aligned with verses 2+), so the floated group holds ONLY the big letter —
    // its left edge then lands flush with the next verse's first word. Paragraph
    // mode has no gutter, so the number stays inside the floated group there.
    const groupInner = paragraphMode
      ? `<span class="kjb-dropcap-num">${verse.verse}</span><span class="kjb-dropcap-letter"${letterStyle}>$2</span>`
      : `<span class="kjb-dropcap-letter"${letterStyle}>$2</span>`;
    html = html.replace(
      /^((?:<[^>]+>|\s)*)([A-Za-z])/,
      `$1<span class="kjb-dropcap-group"${groupStyle}>${groupInner}</span>`
    );
  }

  // Psalm 119 acrostic stanza heading (ALEPH, BETH, …)
  // shown above the verse it precedes.
  const headingLabel = verse.heading ? verse.heading.toUpperCase() : null;
  
  const renderHeadingLabel = () => {
    if (!headingLabel) return null;
    if (!searchTerm || !searchTerm.trim()) return headingLabel;
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    if (!regex.test(headingLabel)) return headingLabel;
    const parts = headingLabel.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} style={{ backgroundColor: 'rgba(250, 204, 21, 0.55)', borderRadius: '3px', padding: '0 2px' }}>{part}</mark> : part
    );
  };

  // In line mode, the heading sits in the same flex row as a verse: a transparent
  // spacer matching the verse-number column, then the heading centered over the
  // verse-text column (so it's centered on the text, not the full page width).
  // In paragraph/column mode it just centers over the whole block.
  const stanzaHeading = verse.heading ? (
    (!columnMode && !paragraphMode) ? (
      <span className="flex items-start mt-6 mb-4 px-[0.4em] gap-[0.6em] w-full">
        <span className="text-[0.6em] shrink-0 invisible mr-[0.3em]">{verse.verse}</span>
        <span
          className={`notranslate flex-1 text-center font-bold text-foreground select-none not-italic tracking-wide ${isCursive ? 'cursive-em-style' : 'font-serif'}`}
          style={{ fontSize: `${zoomLevel / 100 * 1.2}rem` }}
        >
          {renderHeadingLabel()}
        </span>
      </span>
    ) : (
      <span
        className={`notranslate block text-center font-bold text-foreground select-none mt-6 mb-4 not-italic tracking-wide ${isCursive ? 'cursive-em-style' : 'font-serif'}`}
        style={{ fontSize: `${zoomLevel / 100 * 1.2}rem` }}
      >
        {renderHeadingLabel()}
      </span>
    )
  ) : null;

  const verseRef = `${shortBookName} ${chapter}:${verse.verse}`;
  // Build the shared, consistent copy/share text (clean text + deep link).
  // Include the Psalm subscript before verse 1, and the chapter colophon after
  // the last verse — keeping pilcrows and [brackets] intact. `subscript` only
  // ever carries the chapter-wide Psalm title (e.g. "A Song of degrees."),
  // which is null for Psalm 119 — its Hebrew-letter acrostic headings
  // (ALEPH, BETH, ...) live on verse.heading instead, so fall back to that.
  const verseTextToShare = formatVerseShare({
    text: currentText,
    subscript,
    heading: verse.heading || null,
    colophon,
    ref: verseRef,
    url: buildVerseUrl({ abbr, chapter, verse: verse.verse, from: searchTerm ? 'search' : undefined }),
  });

  // Always derive the DISPLAYED color from the freshly-read persisted value
  // (same source showHighlight already uses), never from the local
  // highlightColor state below — that state is only set when THIS
  // component's own picker is used, so it goes stale (and silently keeps
  // rendering whatever color was active at mount, usually yellow) the moment
  // the color is changed via VerseTapBar or the select-mode bar instead.
  const displayColor = persistedColor || highlightColor;
  const highlightBg = highlightColors.find(c => c.name === displayColor)?.bg;
  // In two-column mode, columns sit close together (column-rule divider in the
  // gap) — the highlight's own horizontal padding was pushing its background
  // past the text edge and over that divider line. Use tighter padding there.
  const hlPadX = columnMode ? 'px-[0.12em]' : 'px-[0.3em]';
  // Full-verse background only when the user manually applies a highlight colour.
  // Navigation (highlight prop) just scrolls to the verse; the search term words
  // are already highlighted inline via <mark> tags from renderVerseText.
  const isHighlighted = showHighlight || highlight;

  const handleCopy = async (e) => {
    e.stopPropagation();
    console.log('[VerseText] handleCopy called for', verseRef);
    console.log('[VerseText] Text to copy:', verseTextToShare.substring(0, 100) + '...');
    try {
      // Use deprecated execCommand to avoid Chrome toast notification
      const textarea = document.createElement('textarea');
      textarea.value = verseTextToShare;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      console.log('[VerseText] ✅ Copy via execCommand (no toast)');
    } catch (err) {
      // Fallback to modern API
      await navigator.clipboard.writeText(verseTextToShare);
      console.log('[VerseText] ✅ Clipboard write successful (fallback)');
    }
    setSelected(false);
  };

  const handleToggleSave = (e) => {
    e.stopPropagation();
    const ct = currentText.replace(/\[([^\]]+)\]/g, '$1').replace(/¶\s*/g, '').replace(/^<<[^>]*>>\s*/, '');
    if (saved) {
      removeSavedVerse(abbr, chapter, verse.verse);
      setSaved(false);
      setSelected(false);
    } else {
      // Show the folder picker so the user can choose where to save
      setShowFolderPicker(true);
    }
  };

  const handleSaveToFolder = (folder) => {
    const ct = currentText.replace(/\[([^\]]+)\]/g, '$1').replace(/¶\s*/g, '').replace(/^<<[^>]*>>\s*/, '');
    saveVerse({ abbr, chapter, verse: verse.verse, ref: verseRef, text: ct, folder });
    setSaved(true);
    setShowFolderPicker(false);
    setSelected(false);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    console.log('[VerseText] handleShare called for', verseRef);
    if (nativeShare({ text: verseTextToShare })) {
      setSelected(false);
      return;
    }
    if (navigator.share) {
      console.log('[VerseText] Using native share');
      navigator.share({ text: verseTextToShare });
    } else {
      console.log('[VerseText] Using clipboard fallback');
      navigator.clipboard.writeText(verseTextToShare);
      console.log('[VerseText] ✅ Clipboard write successful');
    }
    setSelected(false);
  };

  // Apply zoom level from parent via inline style
  const textStyle = { fontSize: 'inherit', fontScale: String(zoomLevel / 100), ...(fontFamilyValue ? { fontFamily: fontFamilyValue } : {}) };

  const actionPopover = selected && (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setSelected(false); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setSelected(false); }}
      />
      <VersePopover point={clickPos}>
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowColorPicker(!showColorPicker); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowColorPicker(!showColorPicker); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
            title="Highlight color"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {showColorPicker && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowColorPicker(false); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowColorPicker(false); }}
              />
              <div className="absolute top-full left-0 mt-1.5 z-50 flex flex-col gap-1.5 bg-card border border-border rounded-xl p-3 shadow-xl min-w-[140px]">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="font-sans text-xs font-medium text-muted-foreground">Choose color</p>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowColorPicker(false); }}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowColorPicker(false); }}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {highlightColors.map(color => (
                  <button
                    key={color.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setHighlightColor(color.name);
                      setShowColorPicker(false);
                      setVerseHighlight(abbr, chapter, verse.verse, color.name);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.nativeEvent.stopImmediatePropagation();
                      setHighlightColor(color.name);
                      setShowColorPicker(false);
                      setVerseHighlight(abbr, chapter, verse.verse, color.name);
                    }}
                    className="flex items-center gap-2.5 w-full p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 border-border shadow-sm"
                      style={{ backgroundColor: color.color }}
                    />
                    <span className={`font-sans text-sm ${(persistedColor || highlightColor) === color.name ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {color.label}
                    </span>
                    {(persistedColor || highlightColor) === color.name && showHighlight && (
                      <span className="ml-auto text-xs text-primary font-medium">Active</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {showHighlight ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); removeVerseHighlight(abbr, chapter, verse.verse); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); removeVerseHighlight(abbr, chapter, verse.verse); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 font-sans text-xs font-medium transition-colors"
            title="Remove highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unhighlight</span>
          </button>
        ) : (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setVerseHighlight(abbr, chapter, verse.verse, highlightColor); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setVerseHighlight(abbr, chapter, verse.verse, highlightColor); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
            title="Apply highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Highlight</span>
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleCopy(e); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleCopy(e); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
          title="Copy"
        >
          <Copy className="w-3 h-3" /> <span className="hidden sm:inline">Copy</span>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleShare(e); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleShare(e); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-sans text-xs font-medium transition-colors"
          title="Share"
        >
          <Share2 className="w-3 h-3" /> <span className="hidden sm:inline">Share</span>
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleToggleSave(e); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleToggleSave(e); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
            title={saved ? 'Saved' : 'Save'}
          >
            {saved ? <BookmarkCheck className="w-3 h-3 text-accent" /> : <Bookmark className="w-3 h-3" />}
            <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
          </button>
          {showFolderPicker && (
            <SaveFolderPicker
              onSelect={handleSaveToFolder}
              onCancel={() => { setShowFolderPicker(false); }}
            />
          )}
        </div>
        {onActivateSelect && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setSelected(false); onActivateSelect(verse.verse); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setSelected(false); onActivateSelect(verse.verse); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
            title="Select verses"
          >
            <CheckSquare className="w-3 h-3" /> <span className="hidden sm:inline">Select</span>
          </button>
        )}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setSelected(false); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setSelected(false); }}
          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </VersePopover>
    </>
  );

  // ── PARAGRAPH MODE: verses flow inline; pilcrow verses break to a new line ──
  // \u00B6/\uFFFD/\u000F double as a corrupted-apostrophe placeholder mid-word
  // (e.g. "God\u00B6s" → "God's" — see normalizeApostrophes above), so a bare
  // "does this text contain the byte" check flags nearly every verse with a
  // possessive. Match renderVerseText's own rule for a REAL paragraph pilcrow:
  // only at the very start of the verse, or right after whitespace/punctuation.
  const hasPilcrow = /(^|[\s.,;:!?'")\]])[\u00B6\uFFFD\u000F]/.test(currentText);

  if (paragraphMode) {
    // Pilcrow verse: render as a block (new paragraph) with gap above, no indent
    if (hasPilcrow && !isFirstVerse) {
      return (
        <span id={id} data-pilcrow="true" className="block relative mt-12 scroll-mt-24">
          {stanzaHeading}
          <span
            onClick={handleVerseClick}
            className="inline leading-relaxed rounded cursor-pointer px-[0.3em] py-[0.2em]"
          >
            <sup className="text-accent font-sans font-bold text-[0.65em] mr-2 select-none">{verse.verse}</sup>
            <span className={selectMode && isSelected ? 'bg-primary/10 border border-primary/30 rounded-[0.4em] box-decoration-clone px-[0.2em] py-[0.1em]' : ''}>
              {selectMode && (
                <span className="inline-flex items-center mr-1 text-primary align-middle">
                  {isSelected ? <CheckSquare className="w-[1em] h-[1em]" /> : <Square className="w-[1em] h-[1em] text-muted-foreground" />}
                </span>
              )}
              <span
                className={`kjb-verse-text notranslate leading-relaxed [&_em]:italic [&_em]:text-foreground/75 ${columnMode ? '' : 'break-words'} text-left inline transition-colors duration-200 rounded box-decoration-clone py-[0.1em] ${isHighlighted ? hlPadX : 'pr-[0.3em]'} ${isCursive ? 'cursive-em-style' : ''} ${isHighlighted ? highlightBg : (!selectMode ? 'hover:bg-secondary/60' : '')}`}
                style={isCursive ? { fontSize: `${zoomLevel / 100 * 1.125}rem` } : textStyle}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </span>
          </span>
          {!selectMode && actionPopover}
        </span>
      );
    }
    // Normal inline verse
    return (
      <span id={id} className="inline relative scroll-mt-24">
        {stanzaHeading}
        <span
          onClick={handleVerseClick}
          className="inline leading-loose rounded cursor-pointer px-[0.3em] py-[0.2em]"
        >
          {!(dropCap && !selectMode) && (
            <sup className="text-accent font-sans font-bold text-[0.65em] mr-2 select-none">{verse.verse}</sup>
          )}
          <span className={selectMode && isSelected ? 'bg-primary/10 box-decoration-clone rounded px-[0.2em] py-[0.1em]' : ''}>
            {selectMode && (
              <span className="inline-flex items-center mr-1 text-primary align-middle">
                {isSelected ? <CheckSquare className="w-[1em] h-[1em]" /> : <Square className="w-[1em] h-[1em] text-muted-foreground" />}
              </span>
            )}
            <span
              className={`kjb-verse-text notranslate leading-loose [&_em]:italic [&_em]:text-foreground/75 ${columnMode ? '' : 'break-words'} text-left transition-colors duration-200 rounded box-decoration-clone py-[0.1em] ${isHighlighted ? hlPadX : 'pr-[0.3em]'} ${isCursive ? 'cursive-em-style' : ''} ${isHighlighted ? highlightBg : (!selectMode ? 'hover:bg-secondary/60' : '')}`}
              style={isCursive ? { fontSize: `${zoomLevel / 100 * 1.125}rem` } : textStyle}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </span>
          {' '}
        </span>
        {!selectMode && actionPopover}
      </span>
    );
  }

  // ── LINE MODE (default): each verse is its own line ──
  // Drop-cap verse 1 uses the SAME flex layout (verse-number column + text
  // column) as every other verse, so its text aligns perfectly with verses 2+.
  // The drop-cap group (number + big letter) renders INSIDE the html and is
  // floated/pulled back via CSS so it still begins at the left margin.
  if (dropCap && !selectMode) {
    return (
      <span id={id} className="block relative mt-2 scroll-mt-24" style={{ display: 'flow-root' }}>
        {stanzaHeading}
        <span
          onClick={handleVerseClick}
          className="flex items-start leading-relaxed rounded cursor-pointer px-[0.4em] py-[0.15em] gap-[0.6em] w-full"
        >
          {/* Spacer matching the verse-number column so verse 1's text column
              lines up with verses 2+. The actual number lives in the drop-cap. */}
          <sup className="text-accent font-sans font-bold text-[0.6em] shrink-0 select-none mt-[0.2em] mr-[0.3em] inline-block text-right w-[1.6em]">{verse.verse}</sup>
          <span className="flex-1 min-w-0 leading-relaxed break-words text-left">
            <span
              className={`kjb-verse-text notranslate inline [&_em]:italic [&_em]:text-foreground/75 box-decoration-clone rounded transition-colors duration-200 py-[0.1em] ${isHighlighted ? hlPadX : 'px-[0.3em]'} ${isCursive ? 'cursive-em-style' : ''} ${isHighlighted ? highlightBg : 'hover:bg-secondary/60'}`}
              style={{ display: 'inline', ...(isCursive ? { fontSize: `${zoomLevel / 100 * 1.125}rem` } : textStyle) }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </span>
        </span>
        {actionPopover}
      </span>
    );
  }
  return (
    <span id={id} data-pilcrow={hasPilcrow && !isFirstVerse ? 'true' : undefined} className={`block relative scroll-mt-24 ${hasPilcrow && !isFirstVerse ? 'mt-12' : 'mt-3'}`}>
      {stanzaHeading}
      <span
        onClick={handleVerseClick}
        className="flex items-start leading-relaxed rounded cursor-pointer px-[0.4em] py-[0.15em] gap-[0.6em] w-full"
      >
        <sup className="text-accent font-sans font-bold text-[0.6em] shrink-0 select-none mt-[0.2em] mr-[0.3em] inline-block text-right w-[1.6em]">{verse.verse}</sup>
        <span className={`flex-1 min-w-0 flex items-start gap-[0.6em] ${selectMode && isSelected ? 'bg-primary/10 border border-primary/30 rounded-[0.5em] px-[0.3em] py-[0.1em]' : ''}`}>
          {selectMode && (
            <span className="shrink-0 mt-[0.2em] text-primary">
              {isSelected ? <CheckSquare className="w-[1.1em] h-[1.1em]" /> : <Square className="w-[1.1em] h-[1.1em] text-muted-foreground" />}
            </span>
          )}
          {isHighlighted ? (
            // Highlighted: wrap text in an inline element so the background covers
            // the text only (not the full-width column). box-decoration-clone keeps
            // the tint consistent across wrapped lines.
            <span className={`flex-1 min-w-0 leading-relaxed text-left ${columnMode ? '' : 'break-words'}`}>
              <span
                className={`kjb-verse-text notranslate inline [&_em]:italic [&_em]:text-foreground/75 ${isCursive ? 'cursive-em-style' : ''} ${highlightBg} box-decoration-clone rounded ${hlPadX} py-[0.1em]`}
                style={{ display: 'inline', ...(isCursive ? { fontSize: `${zoomLevel / 100 * 1.125}rem` } : textStyle) }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </span>
          ) : (
            <span className={`flex-1 min-w-0 leading-relaxed text-left ${columnMode ? '' : 'break-words'}`}>
              <span
                className={`kjb-verse-text notranslate inline [&_em]:italic [&_em]:text-foreground/75 transition-colors duration-200 rounded box-decoration-clone px-[0.3em] py-[0.1em] ${isCursive ? 'cursive-em-style' : ''} ${!selectMode ? 'hover:bg-secondary/60' : ''}`}

                style={{ display: 'inline', ...(isCursive ? { fontSize: `${zoomLevel / 100 * 1.125}rem` } : textStyle) }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </span>
          )}
        </span>
      </span>
      {!selectMode && actionPopover}
    </span>
  );
}