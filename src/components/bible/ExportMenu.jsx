import React from 'react';
import { Download, ChevronDown, FileText, FileSpreadsheet, FileType, File } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const OPTIONS = [
  { format: 'pdf', label: 'PDF (.pdf)', Icon: FileType },
  { format: 'docx', label: 'Word (.doc)', Icon: FileText },
  { format: 'xls', label: 'Excel (.csv)', Icon: FileSpreadsheet },
  { format: 'txt', label: 'Plain text (.txt)', Icon: File },
];

export default function ExportMenu({ onExport, count, label = 'Export', warning = false }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={`${label}${count != null ? ` (${count})` : ''}`}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-accent/20 text-foreground font-sans text-xs font-medium transition-colors"
        >
          <Download className="w-3.5 h-3.5 flex-shrink-0" /> <span className="hidden xs:inline">{label}{count != null ? ` (${count})` : ''}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[90vw] sm:w-56 overflow-hidden">
        {OPTIONS.map(({ format, label: l, Icon }) => (
          <DropdownMenuItem
            key={format}
            onClick={() => onExport(format)}
            className="w-full flex items-center gap-2.5 px-4 py-3 sm:py-2.5 text-left font-sans text-sm sm:text-xs text-foreground cursor-pointer"
          >
            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            {l}
          </DropdownMenuItem>
        ))}
        {warning && (
          <div className="px-3 py-2 mt-1 border-t border-border font-sans text-[11px] text-muted-foreground/70 leading-snug">
            Formatting may vary by device and reader. To report a bug, contact{' '}
            <a href="mailto:kingjamesbiblereader@outlook.sg" className="text-primary hover:underline" onClick={e => e.stopPropagation()}>kingjamesbiblereader@outlook.sg</a>.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}