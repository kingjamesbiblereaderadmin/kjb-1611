import React from 'react';
import { Share2, AlignLeft, Link2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Share dropdown for search results: choose to share the verse text or just the link.
export default function ShareMenu({ onShareText, onShareLink, feedback, label = 'Share' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors w-24">
          <Share2 className="w-3.5 h-3.5 flex-shrink-0" /> {feedback ? 'Copied!' : label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onShareText} className="cursor-pointer">
          <AlignLeft className="w-4 h-4 mr-2" />
          Share Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShareLink} className="cursor-pointer">
          <Link2 className="w-4 h-4 mr-2" />
          Share Link Only
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}