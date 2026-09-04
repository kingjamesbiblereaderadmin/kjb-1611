import React from 'react';
import { Highlighter, Copy, Share2, Bookmark, X, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HIGHLIGHT_COLORS } from '@/lib/highlightColors';

// Slim action bar shown under the main reader toolbar when a single verse is
// tapped in normal reading mode — replaces the old floating tap-anchored
// popover so the options never risk overlapping the verse text or toolbar.
export default function VerseTapBar({ label, isHighlighted, isSaved, copyFeedback, shareFeedback, saveFeedback, onToggleHighlight, onCopy, onShare, onSave, onClose }) {
  return (
    <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <span className="font-sans text-xs text-muted-foreground font-medium whitespace-nowrap">{label}</span>
      <div className="w-px h-4 bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap ${isHighlighted ? 'bg-accent/20 text-accent' : 'bg-secondary hover:bg-accent/20 text-foreground'}`}>
            <Highlighter className="w-3.5 h-3.5" /> {isHighlighted ? 'Highlighted' : 'Highlight'} <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]" onCloseAutoFocus={(e) => e.preventDefault()}>
          {isHighlighted && (
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => onToggleHighlight(null)} className="cursor-pointer text-destructive">
              Remove Highlight
            </DropdownMenuItem>
          )}
          {HIGHLIGHT_COLORS.map(c => (
            <DropdownMenuItem key={c.name} onSelect={(e) => e.preventDefault()} onClick={() => onToggleHighlight(c.name)} className="cursor-pointer gap-2.5">
              <span className="w-5 h-5 rounded-full border-2 border-border shadow-sm" style={{ backgroundColor: c.color }} />
              <span className="font-sans text-sm text-foreground">{c.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button onClick={onCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
        <Copy className="w-3.5 h-3.5" /> {copyFeedback ? 'Copied!' : 'Copy'}
      </button>
      <button onClick={onShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
        <Share2 className="w-3.5 h-3.5" /> {shareFeedback ? 'Copied!' : 'Share'}
      </button>
      <button onClick={onSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
        <Bookmark className="w-3.5 h-3.5" /> {saveFeedback ? 'Saved!' : (isSaved ? 'Saved' : 'Save')}
      </button>
      <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap">
        <X className="w-3.5 h-3.5" /> Close
      </button>
    </div>
  );
}