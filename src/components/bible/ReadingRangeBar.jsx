import React, { useEffect, useRef } from 'react';
import { Copy, Share2, AlignLeft, Filter, Printer, BookMarked, ChevronDown, Bookmark, List } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Slim action bar shown when reading a verse range / search result.
// `filterMode` controls whether the reader is filtered to only the selected
// verses (true) or showing the full chapter with them highlighted (false).
export default function ReadingRangeBar({ label, filterMode, copyFeedback, shareFeedback, shareLinkFeedback, saveFeedback, onCopy, onCopyPerVerse, onShareText, onShareTextPerVerse, onShareLink, onSave, onToggleView, onClear, onPrintPage, onPrintContents }) {
  const prevLabelRef = useRef(label);

  useEffect(() => {
    const prevLabel = prevLabelRef.current;
    if (prevLabel && label) {
      const prevPrefix = prevLabel.split(':')[0];
      const currentPrefix = label.split(':')[0];
      if (prevPrefix !== currentPrefix) {
        // If chapter changed during a manual navigation, clear the stale verse selection.
        // Stepper navigations preserve their selection (they have a 'from' query param).
        const params = new URLSearchParams(window.location.search);
        const fromParam = params.get('from');
        if (fromParam !== 'search' && fromParam !== 'gospel') {
          onClear();
        }
      }
    }
    prevLabelRef.current = label;
  }, [label, onClear]);

  return (
    <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <span className="font-sans text-xs text-muted-foreground font-medium whitespace-nowrap">{label}</span>
      <div className="w-px h-4 bg-border" />
      {onCopyPerVerse ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
              <Copy className="w-3.5 h-3.5" /> {copyFeedback ? 'Copied!' : 'Copy'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem onClick={onCopy} className="cursor-pointer">
              <AlignLeft className="w-4 h-4 mr-2" />
              Copy (Passage)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyPerVerse} className="cursor-pointer">
              <List className="w-4 h-4 mr-2" />
              Copy (Per Verse)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          <Copy className="w-3.5 h-3.5" /> {copyFeedback ? 'Copied!' : 'Copy'}
        </button>
      )}
      {onSave && (
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          <Bookmark className="w-3.5 h-3.5" /> {saveFeedback ? 'Saved!' : 'Save'}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
            <Share2 className="w-3.5 h-3.5" /> {shareFeedback || shareLinkFeedback ? 'Copied!' : 'Share'}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem onClick={onShareText} className="cursor-pointer">
            <AlignLeft className="w-4 h-4 mr-2" />
            Share Text (Passage)
          </DropdownMenuItem>
          {onShareTextPerVerse && (
            <DropdownMenuItem onClick={onShareTextPerVerse} className="cursor-pointer">
              <List className="w-4 h-4 mr-2" />
              Share Text (Per Verse)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onShareLink} className="cursor-pointer">
            <Share2 className="w-4 h-4 mr-2" />
            Share Link Only
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        onClick={onPrintContents}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      >
        <Printer className="w-3.5 h-3.5" /> Print
      </button>

      {/* Toggle between filtered (verses only) and full-chapter views */}
      <button
        onClick={onToggleView}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      >
        {filterMode
          ? <><AlignLeft className="w-3.5 h-3.5" /> Full Chapter</>
          : <><Filter className="w-3.5 h-3.5" /> Verses Only</>}
      </button>
      <button
        id="kjb-reading-range-clear-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear(e);
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      >
        Clear
      </button>
    </div>
  );
}