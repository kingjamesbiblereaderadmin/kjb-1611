import React from 'react';
import { Download } from 'lucide-react';

// These are the real, local, same-origin icon files that back the manifest.
// (Previously this page rendered a cross-origin logo to a <canvas> and called
// toDataURL()/uploaded it — that broke because the service worker had cached
// an opaque, non-CORS response for the same image URL, which taints canvas
// reads and throws SecurityError on both download and upload. Serving the
// real static files directly sidesteps all of that: no canvas, no CORS, no
// upload step needed — the files already live in the deployed app.)
const ICONS = [
  { size: 192, src: '/icons/icon-192.png', purpose: 'any' },
  { size: 256, src: '/icons/icon-256.png', purpose: 'any' },
  { size: 384, src: '/icons/icon-384.png', purpose: 'any' },
  { size: 512, src: '/icons/icon-512.png', purpose: 'any' },
  { size: 192, src: '/icons/icon-192-maskable.png', purpose: 'maskable' },
  { size: 512, src: '/icons/icon-512-maskable.png', purpose: 'maskable' },
];

export default function ManifestIcons() {
  return (
    <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 pt-10 pb-32">
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Manifest Icons</h1>
        <p className="font-sans text-sm text-muted-foreground">
          These are the real icon files served from <code>/icons/</code> and referenced in
          <code> manifest.json</code>. They're bundled with the app (same-origin), so they load
          reliably on every domain without CORS issues.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {ICONS.map((icon) => (
          <div key={`${icon.purpose}-${icon.size}`} className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-4 shadow-sm">
            <div
              className="bg-secondary/40 border border-border flex items-center justify-center overflow-hidden"
              style={{
                width: icon.size > 256 ? 256 : icon.size,
                height: icon.size > 256 ? 256 : icon.size,
                // Preview maskable icons the way Android actually crops them
                // (a circle inscribed in the square) so it's obvious at a
                // glance whether the safe-zone padding is enough.
                borderRadius: icon.purpose === 'maskable' ? '9999px' : '1rem',
              }}
            >
              <img src={icon.src} alt={`${icon.size}x${icon.size} ${icon.purpose} icon`} className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <p className="font-sans text-sm font-semibold text-foreground">{icon.size}×{icon.size}</p>
              <p className="font-sans text-xs text-muted-foreground">Purpose: {icon.purpose}</p>
            </div>
            <a
              href={icon.src}
              download={`kjb-icon-${icon.size}-${icon.purpose}.png`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Download {icon.size}px
            </a>
          </div>
        ))}
      </div>

      <p className="font-sans text-xs text-muted-foreground text-center mt-8 max-w-xl mx-auto">
        No upload step needed — these files already ship with the app at <code>public/icons/</code>
        and are referenced directly in <code>manifest.json</code>.
      </p>
    </div>
  );
}
