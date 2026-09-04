import React, { useState } from 'react';
import { Download, Loader2, Columns2, AlignLeft, AlignJustify, List, CheckCircle2, AlertCircle, FileType, FileText, File, FileType2, Type, Tag, BookOpen, BookMarked, Library } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { exportBiblePdf } from '@/lib/exportBiblePdf';
import { DEFAULT_EXPORT_FONT } from '@/lib/exportFonts';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

function Toggle({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-transparent text-foreground border-border hover:border-accent'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="font-sans text-xs font-medium">{label}</span>
    </button>
  );
}

// Rough estimated output size per format, for the WHOLE KJB (~4.2M chars).
// OT/NT are scaled from this by their share of KJV word count (OT ~77%, NT ~23%),
// so e.g. NT txt lands at ~1 MB, matching the actual generated file size.
const BASE_SIZE_MB = { pdf: 6, docx: 5, rtf: 7, txt: 4.5 };
const SCOPE_SIZE_RATIO = { whole: 1, old: 0.77, new: 0.23 };

function formatSizeEstimate(format, scope) {
  const mb = BASE_SIZE_MB[format] * SCOPE_SIZE_RATIO[scope];
  const rounded = mb < 2 ? Math.round(mb * 10) / 10 : Math.round(mb * 2) / 2;
  return `~${rounded} MB`;
}

export default function DownloadBibleSection() {
  const [scope, setScope] = useState('whole');
  const [twoColumn, setTwoColumn] = useState(false);
  const [paragraph, setParagraph] = useState(false);
  const [subscripts, setSubscripts] = useState(true);
  const [colophons, setColophons] = useState(true);
  const [shortNames, setShortNames] = useState(false);
  const [format, setFormat] = useState('pdf');
  const [font, setFont] = useState(DEFAULT_EXPORT_FONT);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setBusy(true);
    setError('');
    setProgress(0);
    setStatus('Preparing…');
    try {
      await exportBiblePdf({ scope, twoColumn, paragraph, subscripts, colophons, shortNames, format, font }, (pct, msg) => {
        setProgress(pct);
        setStatus(msg);
      });
    } catch (err) {
      console.error('Bible PDF export error:', err);
      setError('Failed to generate PDF: ' + err.message);
    }
    setBusy(false);
  };

  return (
    <div className="p-5 pt-0 space-y-5">
      <p className="font-sans text-sm text-muted-foreground">
        Download the entire King James Bible — including title pages, pilcrows and italics — in your chosen layout. Runs on your device.
      </p>

      {/* Scope — whole Bible, Old Testament, or New Testament */}
      <div className="space-y-2">
        <p className="font-sans text-sm font-medium text-foreground">Include</p>
        <div className="flex gap-2">
          <Toggle active={scope === 'whole'} onClick={() => setScope('whole')} icon={Library} label="Whole" />
          <Toggle active={scope === 'old'} onClick={() => setScope('old')} icon={BookMarked} label="Old Test." />
          <Toggle active={scope === 'new'} onClick={() => setScope('new')} icon={BookOpen} label="New Test." />
        </div>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <p className="font-sans text-sm font-medium text-foreground">Format</p>
        <div className="flex gap-2">
          <Toggle active={format === 'pdf'} onClick={() => setFormat('pdf')} icon={FileType} label="PDF" />
          <Toggle active={format === 'docx'} onClick={() => setFormat('docx')} icon={FileText} label="Word" />
          <Toggle active={format === 'rtf'} onClick={() => setFormat('rtf')} icon={FileType2} label="RTF" />
          <Toggle active={format === 'txt'} onClick={() => setFormat('txt')} icon={File} label="Text" />
        </div>
        {format === 'txt' && (
          <p className="font-sans text-xs text-muted-foreground">Italics are shown in [brackets] in the text file.</p>
        )}
        {format === 'rtf' && (
          <p className="font-sans text-xs text-muted-foreground">Rich text with real italics — opens in Word, Pages or WordPad.</p>
        )}
      </div>

      {/* Column layout — PDF, Word & RTF */}
      {(format === 'pdf' || format === 'docx' || format === 'rtf') && (
        <div className="space-y-2">
          <p className="font-sans text-sm font-medium text-foreground">Columns</p>
          <div className="flex gap-2">
            <Toggle active={!twoColumn} onClick={() => setTwoColumn(false)} icon={AlignLeft} label="Single" />
            <Toggle active={twoColumn} onClick={() => setTwoColumn(true)} icon={Columns2} label="Two" />
          </div>
        </div>
      )}

      {/* Flow */}
      <div className="space-y-2">
        <p className="font-sans text-sm font-medium text-foreground">Reading Flow</p>
        <div className="flex gap-2">
          <Toggle active={!paragraph} onClick={() => setParagraph(false)} icon={List} label="Line" />
          <Toggle active={paragraph} onClick={() => setParagraph(true)} icon={AlignJustify} label="Paragraph" />
        </div>
      </div>

      {/* Book names */}
      <div className="space-y-2">
        <p className="font-sans text-sm font-medium text-foreground">Book Names</p>
        <div className="flex gap-2">
          <Toggle active={!shortNames} onClick={() => setShortNames(false)} icon={Type} label="Full" />
          <Toggle active={shortNames} onClick={() => setShortNames(true)} icon={Tag} label="Short" />
        </div>
        <p className="font-sans text-xs text-muted-foreground">
          {shortNames ? 'e.g. "Gen", "Matt"' : 'e.g. "Genesis", "The Gospel According to Saint Matthew"'}
        </p>
      </div>

      {/* Includes — subscripts are OT-only (Psalms), colophons are NT-only (Epistles) */}
      <div className="space-y-3 pt-2 border-t border-border">
        {scope !== 'new' && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-sm text-foreground font-medium">Include Subscripts</p>
              <p className="font-sans text-xs text-muted-foreground">Psalm superscriptions / titles</p>
            </div>
            <Switch checked={subscripts} onCheckedChange={setSubscripts} className="shrink-0" />
          </div>
        )}
        {scope !== 'old' && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-sans text-sm text-foreground font-medium">Include Colophons</p>
              <p className="font-sans text-xs text-muted-foreground">Epistle closing notes</p>
            </div>
            <Switch checked={colophons} onCheckedChange={setColophons} className="shrink-0" />
          </div>
        )}
      </div>

      {/* Generate */}
      <button
        onClick={handleGenerate}
        disabled={busy}
        className="flex w-full justify-center items-center gap-2 py-1.5 rounded-xl bg-primary border border-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy ? 'Downloading…' : `Download Bible (${format === 'docx' ? 'Word' : format.toUpperCase()})`}{/* RTF/PDF/TXT show as-is */}
        {!busy && <span className="opacity-70 text-xs font-normal">· {formatSizeEstimate(format, scope)}</span>}
      </button>

      {busy && (
        <div className="space-y-2">
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="font-sans text-xs text-muted-foreground">{status}</p>
        </div>
      )}
      {!busy && status === 'Done!' && (
        <p className="font-sans text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> {isNativeAndroid() ? 'Saved to your Downloads folder!' : 'File downloaded successfully!'}
        </p>
      )}
      {error && (
        <p className="font-sans text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      <p className="font-sans text-xs text-muted-foreground pt-2 border-t border-border">
        There may be occasional formatting issues depending on your device and reader. For feedback or to report a bug, please contact{' '}
        <a href="mailto:kingjamesbiblereader@outlook.sg" className="text-primary font-medium underline">
          kingjamesbiblereader@outlook.sg
        </a>.
      </p>
    </div>
  );
}