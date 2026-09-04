import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, BookOpen, Share2, Copy, FolderPlus, Folder, MoreVertical, Edit2, Search, Printer, CheckSquare, Square, X } from 'lucide-react';
import { getSavedVerses, removeSavedVerse, getSavedFolders, createFolder, deleteFolder, updateVerseFolder } from '@/lib/savedVerses';
import { formatVerseShare, buildVerseUrl } from '@/lib/formatDailyVerse';
import { printHtml } from '@/lib/printHelpers';
import { nativeShare } from '@/lib/nativeShare';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function SavedVersesPage() {
  const [saved, setSaved] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const navigate = useNavigate();

  const verseKey = (v) => `${v.abbr}:${v.chapter}:${v.verse}`;

  const toggleSelect = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(visibleVerses.map(verseKey)));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  const loadData = () => {
    setSaved(getSavedVerses());
    setFolders(getSavedFolders());
  };

  useEffect(() => {
    loadData();
    // Re-read from localStorage after cloud sync completes (signed-in users)
    const onSynced = () => loadData();
    window.addEventListener('kjb-saved-synced', onSynced);
    return () => window.removeEventListener('kjb-saved-synced', onSynced);
  }, []);

  const handleRemove = (abbr, chapter, verse) => {
    setSaved(prev => prev.filter(v => !(v.abbr === abbr && v.chapter === chapter && v.verse === verse)));
    removeSavedVerse(abbr, chapter, verse);
  };

  const handleCreateFolder = () => {
    const name = window.prompt("Enter new folder name:");
    if (name && name.trim()) {
      const trimmed = name.trim();
      setFolders(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
      createFolder(trimmed);
      setActiveFolder(trimmed);
    }
  };

  const handleDeleteFolder = (name) => {
    if (window.confirm(`Are you sure you want to delete the folder "${name}"? Verses will be moved to Favorites.`)) {
      setFolders(prev => prev.filter(f => f !== name));
      setSaved(prev => prev.map(v => v.folder === name ? { ...v, folder: 'Favorites' } : v));
      deleteFolder(name);
      setActiveFolder('All');
    }
  };

  const handleMoveVerse = (entry, newFolder) => {
    setSaved(prev => prev.map(v =>
      v.abbr === entry.abbr && v.chapter === entry.chapter && v.verse === entry.verse
        ? { ...v, folder: newFolder }
        : v
    ));
    updateVerseFolder(entry.abbr, entry.chapter, entry.verse, newFolder);
    toast.success(`Moved to ${newFolder}`);
  };

  const buildShareText = (entry) =>
    formatVerseShare({
      text: entry.text,
      ref: entry.ref,
      url: buildVerseUrl({ abbr: entry.abbr, chapter: entry.chapter, verse: entry.verse }),
    });

  const handleShare = async (entry) => {
    const shareText = buildShareText(entry);
    if (nativeShare({ title: `${entry.ref} — KJB Reader`, text: shareText })) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${entry.ref} — KJB Reader`, text: shareText });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Copied to clipboard');
    } catch {}
  };

  const handleCopy = async (entry) => {
    try {
      await navigator.clipboard.writeText(buildShareText(entry));
      toast.success('Copied to clipboard');
    } catch {}
  };

  const visibleVerses = useMemo(() => saved
    .filter(entry => activeFolder === 'All' || (entry.folder || 'Favorites') === activeFolder)
    .filter(entry => !searchQuery || entry.text.toLowerCase().includes(searchQuery.toLowerCase()) || entry.ref.toLowerCase().includes(searchQuery.toLowerCase())),
    [saved, activeFolder, searchQuery]);

  const selectedEntries = visibleVerses.filter(v => selected.has(verseKey(v)));

  const handleBulkCopy = async () => {
    if (selectedEntries.length === 0) return;
    const text = selectedEntries.map(buildShareText).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${selectedEntries.length} verse${selectedEntries.length !== 1 ? 's' : ''}`);
    } catch { toast.error('Copy failed'); }
  };

  const handleBulkShare = async () => {
    if (selectedEntries.length === 0) return;
    const text = selectedEntries.map(buildShareText).join('\n\n');
    if (nativeShare({ title: 'Saved Verses — KJB Reader', text })) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Saved Verses — KJB Reader', text });
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${selectedEntries.length} verse${selectedEntries.length !== 1 ? 's' : ''}`);
    } catch {}
  };

  const handleBulkMove = (newFolder) => {
    selectedEntries.forEach(entry => {
      updateVerseFolder(entry.abbr, entry.chapter, entry.verse, newFolder);
    });
    setSaved(prev => prev.map(v =>
      selected.has(verseKey(v)) ? { ...v, folder: newFolder } : v
    ));
    toast.success(`Moved ${selectedEntries.length} verse${selectedEntries.length !== 1 ? 's' : ''} to ${newFolder}`);
    clearSelection();
  };

  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedEntries.length} saved verse${selectedEntries.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    selectedEntries.forEach(entry => {
      removeSavedVerse(entry.abbr, entry.chapter, entry.verse);
    });
    setSaved(prev => prev.filter(v => !selected.has(verseKey(v))));
    clearSelection();
  };

  const handleBulkPrint = () => {
    if (selectedEntries.length === 0) return;
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' at ' + now.toLocaleTimeString();
    const header = `<h1 style="font-family:Georgia,serif;font-size:22pt;text-align:center;margin-bottom:24pt;">Saved Verses</h1>`;
    const body = selectedEntries.map((entry) =>
      `<div style="margin:0 0 16pt 0;page-break-inside:avoid;break-inside:avoid;">` +
      `<p style="font-family:system-ui,sans-serif;font-size:9pt;letter-spacing:0.08em;text-transform:uppercase;color:#666;margin:0 0 4pt 0;">${esc(entry.ref)} (KJB)</p>` +
      `<blockquote style="margin:0;font-family:Georgia,serif;font-size:12pt;line-height:1.6;">&ldquo;${esc(entry.text)}&rdquo;</blockquote>` +
      `</div>`
    ).join('');
    const footer = `<div style="margin-top:30pt;padding-top:10pt;border-top:1px solid #eee;font-size:10pt;color:#777;page-break-inside:avoid;">${selectedEntries.length} verse${selectedEntries.length !== 1 ? 's' : ''} &mdash; King James Bible<br/>Printed on ${dateStr}</div>`;
    printHtml(header + body + footer);
  };

  const handlePrint = () => {
    if (visibleVerses.length === 0) {
      toast.error('No verses to print');
      return;
    }
    const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const now = new Date();
    const dateStr = now.toLocaleDateString() + ' at ' + now.toLocaleTimeString();
    const title = activeFolder === 'All' ? 'Saved Verses' : `Saved Verses — ${activeFolder}`;
    const header = `<h1 style="font-family:Georgia,serif;font-size:22pt;text-align:center;margin-bottom:24pt;">${esc(title)}</h1>`;
    const body = visibleVerses.map((entry) =>
      `<div style="margin:0 0 16pt 0;page-break-inside:avoid;break-inside:avoid;">` +
      `<p style="font-family:system-ui,sans-serif;font-size:9pt;letter-spacing:0.08em;text-transform:uppercase;color:#666;margin:0 0 4pt 0;">${esc(entry.ref)} (KJB)</p>` +
      `<blockquote style="margin:0;font-family:Georgia,serif;font-size:12pt;line-height:1.6;">&ldquo;${esc(entry.text)}&rdquo;</blockquote>` +
      `</div>`
    ).join('');
    const footer = `<div style="margin-top:30pt;padding-top:10pt;border-top:1px solid #eee;font-size:10pt;color:#777;page-break-inside:avoid;">${visibleVerses.length} verse${visibleVerses.length !== 1 ? 's' : ''} &mdash; King James Bible<br/>Printed on ${dateStr}</div>`;
    printHtml(header + body + footer);
  };

  const handleNavigate = (entry) => {
    try {
      localStorage.setItem('kjb-position', JSON.stringify({ abbr: entry.abbr, chapter: entry.chapter, verse: entry.verse }));
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate('/read'), 150);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
    <div className="w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg shadow-pink-500/30 mb-4">
          <Bookmark className="w-7 h-7 text-white" />
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Saved Verses</h1>
        <p className="font-sans text-sm text-muted-foreground">{saved.length} verse{saved.length !== 1 ? 's' : ''} saved</p>
        <div className="mt-4 w-16 h-px bg-accent mx-auto" />
      </div>

      {saved.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search saved verses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl py-3 pl-11 pr-4 font-sans text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground font-sans text-sm font-medium hover:bg-accent/20 transition-colors whitespace-nowrap"
            title="Print saved verses"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          <button
            onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelected(new Set()); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-sans text-sm font-medium transition-colors whitespace-nowrap ${
              selectMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-foreground hover:bg-accent/20'
            }`}
            title="Select verses"
          >
            {selectMode ? <X className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
            <span className="hidden sm:inline">{selectMode ? 'Done' : 'Select'}</span>
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="sticky top-2 z-20 mb-6 flex items-center gap-2 flex-wrap p-3 rounded-2xl bg-primary/10 backdrop-blur-xl border border-primary/30 shadow-lg">
          <span className="font-sans text-sm font-medium text-foreground mr-1">
            {selected.size} selected
          </span>
          <button onClick={selectAllVisible} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors">
            <CheckSquare className="w-3.5 h-3.5" /> All
          </button>
          <button onClick={handleBulkCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors">
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          <button onClick={handleBulkShare} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors">
                <Folder className="w-3.5 h-3.5" /> Move
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[90vw] sm:w-48">
              {folders.map(f => (
                <DropdownMenuItem key={f} onClick={() => handleBulkMove(f)} className="py-3 sm:py-1.5">
                  <Folder className="w-4 h-4 mr-2" />
                  <span className="font-sans text-sm sm:text-xs">{f}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreateFolder} className="py-3 sm:py-1.5">
                <FolderPlus className="w-4 h-4 mr-2" />
                <span className="font-sans text-sm sm:text-xs">New Folder...</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button onClick={handleBulkPrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive font-sans text-xs font-medium hover:bg-destructive/20 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent text-muted-foreground font-sans text-xs font-medium hover:bg-secondary transition-colors ml-auto">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}
      
      {/* Folder Navigation */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveFolder('All')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors ${
            activeFolder === 'All' 
              ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/20' 
              : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
          }`}
        >
          All
        </button>
        {folders.map(folder => (
          <div key={folder} className="flex items-center">
            <button
              onClick={() => setActiveFolder(folder)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm font-medium whitespace-nowrap transition-colors ${
                activeFolder === folder 
                  ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              {folder}
            </button>
            {activeFolder === folder && folder !== 'Favorites' && (
              <button 
                onClick={() => handleDeleteFolder(folder)}
                className="ml-1 p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full"
                title="Delete Folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={handleCreateFolder}
          className="flex items-center gap-2 px-4 py-2 rounded-full font-sans text-sm font-medium whitespace-nowrap bg-secondary/50 text-secondary-foreground border border-dashed border-border hover:bg-secondary transition-colors"
        >
          <FolderPlus className="w-4 h-4" />
          New Folder
        </button>
      </div>

      {saved.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="font-serif text-xl text-muted-foreground mb-2">No saved verses yet</p>
          <p className="font-sans text-sm text-muted-foreground mb-6">Tap any verse while reading and press the bookmark icon to save it.</p>
          <button
            onClick={() => navigate('/read')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-sans text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <BookOpen className="w-4 h-4" />
            Start Reading
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {saved
            .filter(entry => activeFolder === 'All' || (entry.folder || 'Favorites') === activeFolder)
            .filter(entry => !searchQuery || entry.text.toLowerCase().includes(searchQuery.toLowerCase()) || entry.ref.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((entry, i) => (
            <div
              key={i}
              className={`bg-card/70 backdrop-blur-xl border rounded-2xl p-5 flex items-start gap-4 shadow-lg shadow-black/[0.03] transition-shadow hover:shadow-xl ${
                selected.has(verseKey(entry)) ? 'border-primary ring-1 ring-primary/30' : 'border-border/60'
              }`}
            >
              {selectMode && (
                <button
                  onClick={() => toggleSelect(verseKey(entry))}
                  className="flex-shrink-0 mt-1"
                  title="Toggle select"
                >
                  {selected.has(verseKey(entry))
                    ? <CheckSquare className="w-5 h-5 text-primary" />
                    : <Square className="w-5 h-5 text-muted-foreground" />}
                </button>
              )}
              <button
                onClick={() => selectMode ? toggleSelect(verseKey(entry)) : handleNavigate(entry)}
                className="flex-1 text-left"
                disabled={selectMode}
              >
                <p className="font-sans text-xs font-semibold text-accent tracking-wide uppercase mb-2">
                  {entry.ref} {activeFolder === 'All' && <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] lowercase tracking-normal">{entry.folder || 'Favorites'}</span>}
                </p>
                <blockquote className="font-serif text-lg text-foreground leading-relaxed">
                  "{entry.text}"
                </blockquote>
              </button>
              
              {!selectMode && (
              <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Move"
                    >
                      <Folder className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[90vw] sm:w-48">
                    <div className="px-2 py-2 sm:py-1.5 text-xs font-semibold text-muted-foreground">Move to...</div>
                    {folders.map(f => (
                      <DropdownMenuItem 
                        key={f}
                        onClick={() => handleMoveVerse(entry, f)}
                        className={`py-3 sm:py-1.5 ${(entry.folder || 'Favorites') === f ? 'bg-secondary' : ''}`}
                      >
                        <Folder className="w-4 h-4 mr-2" />
                        <span className="font-sans text-sm sm:text-xs">{f}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCreateFolder} className="py-3 sm:py-1.5">
                      <FolderPlus className="w-4 h-4 mr-2" />
                      <span className="font-sans text-sm sm:text-xs">New Folder...</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  onClick={() => handleCopy(entry)}
                  className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleShare(entry)}
                  className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemove(entry.abbr, entry.chapter, entry.verse)}
                  className="p-2 rounded-lg border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              )}
            </div>
          ))}
          {saved.filter(entry => activeFolder === 'All' || (entry.folder || 'Favorites') === activeFolder).filter(entry => !searchQuery || entry.text.toLowerCase().includes(searchQuery.toLowerCase()) || entry.ref.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
            <div className="text-center py-12">
              <p className="font-sans text-sm text-muted-foreground">
                {searchQuery ? "No verses match your search." : "No verses in this folder."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}