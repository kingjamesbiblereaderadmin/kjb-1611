import React from 'react';
import { Download, Share2, Maximize2, MoreVertical, Printer, Copy, Eye, Palette, Image as ImageIcon, Crop, Trash2, ChevronsDown } from 'lucide-react';

export default function VerseActionButtons({ 
  showButtons, 
  capturing, 
  hasCustomBg, 
  showVersePanel, 
  showStyleEditor, 
  uploading,
  originalBg, 
  customBg, 
  pendingBg,
  onShowLightbox, 
  onShare, 
  onDownload, 
  onPrint,
  onTogglePanel,
  onShowStyleEditor,
  onUploadClick,
  onCropClick,
  onRemoveBackground,
  onHideButtons,
  setShowMenu,
  setShowStyleEditor
}) {
  const [showMenu, setLocalShowMenu] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setLocalShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  if (!showButtons) return null;

  return (
    <div className="absolute top-2 right-2 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
      {!capturing ? (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowLightbox();
            }}
            className="p-1.5 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/40 shadow-md transition-colors touch-manipulation"
            title="View in full screen"
            type="button"
          >
            <Maximize2 className="w-3.5 h-3.5 pointer-events-none text-white drop-shadow" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(e);
            }}
            disabled={capturing}
            className="p-1.5 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/40 shadow-md transition-colors disabled:opacity-50 touch-manipulation"
            title="Share verse image"
            type="button"
          >
            <Share2 className="w-3.5 h-3.5 pointer-events-none text-white drop-shadow" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(e);
            }}
            disabled={capturing}
            className="p-1.5 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/40 shadow-md transition-colors disabled:opacity-50 touch-manipulation"
            title="Download verse image"
            type="button"
          >
            <Download className="w-3.5 h-3.5 pointer-events-none text-white drop-shadow" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrint(e);
            }}
            disabled={capturing}
            className="p-1.5 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/40 shadow-md transition-colors disabled:opacity-50 touch-manipulation"
            title="Print verse image"
            type="button"
          >
            <Printer className="w-3.5 h-3.5 pointer-events-none text-white drop-shadow" />
          </button>
          {/* Unified menu button */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!showStyleEditor) {
                  setLocalShowMenu(!showMenu);
                  setShowMenu(!showMenu);
                }
              }}
              className="p-1.5 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/40 shadow-md transition-colors touch-manipulation"
              title="More options"
              type="button"
            >
              <MoreVertical className="w-3.5 h-3.5 pointer-events-none text-white drop-shadow" />
            </button>
            {/* Dropdown menu */}
            {showMenu && (
              <div
                className="absolute right-0 top-8 z-30 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden w-48 py-0"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                >
                  <Copy className="w-4 h-4 pointer-events-none" />
                  Copy Verse
                </button>
                {hasCustomBg && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePanel();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                  >
                    <Eye className="w-4 h-4 pointer-events-none" />
                    {showVersePanel ? 'Hide Panel' : 'Show Panel'}
                  </button>
                )}
                {!showStyleEditor && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowStyleEditor();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                  >
                    <Palette className="w-4 h-4 pointer-events-none" />
                    Text Style
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onUploadClick();
                  }}
                  disabled={uploading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 touch-manipulation"
                >
                  <ImageIcon className="w-4 h-4 pointer-events-none" />
                  {uploading ? 'Uploading...' : 'Change Background'}
                </button>
                {(originalBg || customBg || pendingBg) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onCropClick();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                  >
                    <Crop className="w-4 h-4 pointer-events-none" />
                    Crop Background
                  </button>
                )}
                {(customBg || pendingBg) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBackground();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                  >
                    <Trash2 className="w-4 h-4 pointer-events-none" />
                    Remove Custom Background
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onHideButtons();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                >
                  <ChevronsDown className="w-4 h-4 rotate-180 pointer-events-none" />
                  Hide All Buttons
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="p-1.5 flex items-center justify-center rounded-lg bg-black/60 hover:bg-black/75 backdrop-blur-md border border-white/40 shadow-md transition-colors touch-manipulation"
          title="Show buttons"
          type="button"
        >
          <ChevronsDown className="w-3.5 h-3.5 rotate-90 pointer-events-none text-white drop-shadow" />
        </button>
      )}
    </div>
  );
}