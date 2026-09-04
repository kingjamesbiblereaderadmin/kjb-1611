import React from 'react';
import { CheckSquare, X, Copy, Share2, BookMarked, AlignLeft, List, Printer, Bookmark, Highlighter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HIGHLIGHT_COLORS } from '@/lib/highlightColors';

// Action bar shown while in verse-select mode in the reader.
export default function SelectActionBar({
  selectedCount, totalVerses, copyFeedback, shareFeedback, shareLinkFeedback, saveFeedback,
  onSelectAll, onCancel, onCopy, onCopyPerVerse, onShareText, onShareTextPerVerse, onShareLink, onReadSelected, onShowFull, onPrintPage, onPrintContents, onSave, onHighlight
}) {
  return (
    <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <span className="font-sans text-xs text-muted-foreground font-medium whitespace-nowrap">
        {selectedCount === 0 ? '0' : selectedCount}{selectedCount === 0 ? '' : `/${totalVerses}`} selected
      </span>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={onSelectAll}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      >
        <CheckSquare className="w-3.5 h-3.5" /> All
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      >
        <X className="w-3.5 h-3.5" /> Cancel
      </button>
      {selectedCount > 0 && (
        <>
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
              <DropdownMenuItem onClick={onShareTextPerVerse} className="cursor-pointer">
                <List className="w-4 h-4 mr-2" />
                Share Text (Per Verse)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShareLink} className="cursor-pointer">
                <Share2 className="w-4 h-4 mr-2" />
                Share Link Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuItem onClick={onPrintPage} className="cursor-pointer">
                <Printer className="w-4 h-4 mr-2" />
                Print Full Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPrintContents} className="cursor-pointer">
                <BookMarked className="w-4 h-4 mr-2" />
                Print Selected Verses
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <Bookmark className="w-3.5 h-3.5" /> {saveFeedback ? 'Saved!' : 'Save'}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
                <Highlighter className="w-3.5 h-3.5" /> Highlight
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]" onCloseAutoFocus={(e) => e.preventDefault()}>
              {HIGHLIGHT_COLORS.map(c => (
                <DropdownMenuItem key={c.name} onSelect={(e) => e.preventDefault()} onClick={() => onHighlight(c.name)} className="cursor-pointer gap-2.5">
                  <span className="w-5 h-5 rounded-full border-2 border-border shadow-sm" style={{ backgroundColor: c.color }} />
                  <span className="font-sans text-sm text-foreground">{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onReadSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <BookMarked className="w-3.5 h-3.5" /> Read Selected
          </button>
          <button
            onClick={onShowFull}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <AlignLeft className="w-3.5 h-3.5" /> Show Full Chapter
          </button>
        </>
      )}
    </div>
  );
}