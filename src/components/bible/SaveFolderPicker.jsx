import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, FolderPlus, Check, X, Folder } from 'lucide-react';
import { getSavedFolders, createFolder } from '@/lib/savedVerses';

export default function SaveFolderPicker({ onSelect, onCancel }) {
  const [folders, setFolders] = useState(getSavedFolders());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (showNewFolder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewFolder]);

  const handleCreate = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolder(name);
    onSelect(name);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onCancel(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onCancel(); }}
      />
      <div className="absolute top-full left-0 mt-1.5 z-[60] flex flex-col gap-1 bg-card border border-border rounded-xl p-3 shadow-xl min-w-[180px] max-w-[240px]">
        <div className="flex items-center justify-between mb-1">
          <p className="font-sans text-xs font-medium text-muted-foreground">Save to folder</p>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onCancel(); }}
            onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onCancel(); }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {showNewFolder ? (
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
                if (e.key === 'Escape') { e.preventDefault(); setShowNewFolder(false); setNewFolderName(''); }
              }}
              placeholder="Folder name"
              className="w-full px-2.5 py-1.5 rounded-lg bg-background border border-border font-sans text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              onClick={(e) => { e.stopPropagation(); }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
            />
            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowNewFolder(false); setNewFolderName(''); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowNewFolder(false); setNewFolderName(''); }}
                className="flex-1 px-2 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-sans text-xs font-medium hover:bg-accent/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleCreate(); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); handleCreate(); }}
                disabled={!newFolderName.trim()}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground font-sans text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                <Check className="w-3 h-3" />
                Create
              </button>
            </div>
          </div>
        ) : (
          <>
            {folders.map(folder => (
              <button
                key={folder}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onSelect(folder); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); onSelect(folder); }}
                className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-secondary transition-colors text-left"
              >
                <Folder className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-sans text-sm text-foreground truncate">{folder}</span>
              </button>
            ))}
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowNewFolder(true); }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); setShowNewFolder(true); }}
              className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-secondary transition-colors text-left border-t border-border mt-1 pt-2"
            >
              <FolderPlus className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="font-sans text-sm text-primary font-medium">New Folder</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}