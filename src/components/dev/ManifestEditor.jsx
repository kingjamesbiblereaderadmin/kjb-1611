import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { autoCropIconFile } from '@/lib/iconAutoCrop';
import { Loader2, Upload, Save, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';

// Shared DevTools key — authorizes the save function in a public/preview
// session (no admin login required).
const DEV_KEY = 'KJB-DEV-2026';

// Icon set the manifest needs. Maskable variants pad to a safe zone.
const ICON_SPECS = [
  { size: 192, purpose: 'any' },
  { size: 512, purpose: 'any' },
  { size: 512, purpose: 'maskable' },
];

export default function ManifestEditor() {
  const [cfg, setCfg] = useState(null);         // entity row or null
  const [icons, setIcons] = useState([]);        // working icon list
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [validation, setValidation] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.ManifestConfig.list('-updated_date', 1);
      const row = rows[0] || null;
      setCfg(row);
      setIcons(row?.icons?.length ? row.icons : []);
    } catch (err) {
      setMsg('Load failed: ' + (err.message || 'unknown'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Upload one source image, auto-crop into all icon sizes, upload each, build icon list.
  const handleSource = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setBusy('Processing icons…');
    setMsg('');
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const built = [];
      for (const spec of ICON_SPECS) {
        setBusy(`Cropping ${spec.size}px ${spec.purpose}…`);
        const cropped = await autoCropIconFile(dataUrl, spec.size, { maskable: spec.purpose === 'maskable' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file: cropped });
        built.push({ src: file_url, sizes: `${spec.size}x${spec.size}`, type: 'image/png', purpose: spec.purpose });
      }
      // Add a 192 "any" duplicate of the 512 any at 192 size already covered; keep set as-is.
      setIcons(built);
      setMsg('Icons generated & uploaded. Click Save to apply for all users.');
    } catch (err) {
      setMsg('Icon processing failed: ' + (err.message || 'unknown'));
    }
    setBusy('');
  };

  const save = async () => {
    setBusy('Saving…');
    setMsg('');
    try {
      const res = await base44.functions.invoke('saveManifestConfig', { icons, key: DEV_KEY });
      if (res?.data?.config) setCfg(res.data.config);
      setMsg('Saved. The manifest will serve these icons — republish/clear cache to see them install.');
    } catch (err) {
      setMsg('Save failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
    setBusy('');
  };

  const resetToDefaults = async () => {
    if (!cfg) { setMsg('Already using built-in default icons.'); return; }
    if (!confirm('Remove custom icons and revert the manifest to the built-in defaults?')) return;
    setBusy('Reverting…');
    try {
      await base44.functions.invoke('saveManifestConfig', { revert: true, key: DEV_KEY });
      setCfg(null);
      setIcons([]);
      setMsg('Reverted to default icons.');
    } catch (err) {
      setMsg('Revert failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
    setBusy('');
  };

  // Fetch the live manifest and validate it against install requirements.
  const testManifest = async () => {
    setBusy('Testing manifest…');
    setValidation(null);
    setMsg('');
    try {
      const res = await fetch('/functions/manifest', { cache: 'no-store' });
      const json = await res.json();
      const checks = [];
      const push = (ok, label) => checks.push({ ok, label });

      push(!!json.name, 'Has name');
      push(!!json.short_name, 'Has short_name');
      push(json.start_url === '/', 'start_url is "/"');
      push(json.display === 'standalone', 'display is standalone');
      push(Array.isArray(json.icons) && json.icons.length > 0, 'Has icons');
      const has192any = (json.icons || []).some(i => /(^|\s)192x192/.test(i.sizes) && (i.purpose || 'any').includes('any'));
      push(has192any, 'Has ≥192px "any" icon');
      const hasMaskable = (json.icons || []).some(i => (i.purpose || '').includes('maskable'));
      push(hasMaskable, 'Has maskable icon');
      const has512 = (json.icons || []).some(i => /512x512/.test(i.sizes));
      push(has512, 'Has 512px icon');
      push(!!json.theme_color, 'Has theme_color');
      push(!!json.background_color, 'Has background_color');
      const narrow = (json.screenshots || []).some(s => s.form_factor === 'narrow');
      push(narrow, 'Has narrow screenshot');

      setValidation({ checks, raw: json });
    } catch (err) {
      setMsg('Test failed: ' + (err.message || 'unknown'));
    }
    setBusy('');
  };

  const shownIcons = icons.length ? icons : null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <p className="font-sans text-sm font-semibold text-foreground">Manifest icons</p>
        <p className="font-sans text-xs text-muted-foreground">
          Upload one square-ish source image. It's auto-cropped & padded into the required sizes (192/512 "any" + 512 maskable with a safe zone), uploaded, then saved so the live manifest serves them.
        </p>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleSource} className="hidden" />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Upload className="w-4 h-4" /> Upload & Auto-Crop
          </button>
          <button onClick={save} disabled={!!busy || !icons.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-accent/20 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
          </button>
          <button onClick={resetToDefaults} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> Revert to defaults
          </button>
        </div>
        {busy && <p className="text-xs text-primary flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy}</p>}
        {msg && <p className="text-xs text-primary">{msg}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary/70" /></div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="font-sans text-xs text-muted-foreground mb-3">
            {shownIcons ? 'Current custom icons:' : 'Using built-in default icons (no custom set saved).'}
          </p>
          {shownIcons && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {shownIcons.map((ic, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 bg-secondary/40 border border-border flex items-center justify-center overflow-hidden"
                    style={{ borderRadius: ic.purpose?.includes('maskable') ? '9999px' : '1rem' }}>
                    <img src={ic.src} alt={ic.sizes} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{ic.sizes} · {ic.purpose}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manifest validator */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-sans text-sm font-semibold text-foreground">Test manifest</p>
          <button onClick={testManifest} disabled={!!busy}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
            Run checks
          </button>
        </div>
        {validation && (
          <div className="space-y-1.5">
            {validation.checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {c.ok
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <AlertCircle className="w-4 h-4 text-amber-600" />}
                <span className={c.ok ? 'text-foreground' : 'text-amber-600 font-medium'}>{c.label}</span>
              </div>
            ))}
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer">View raw manifest</summary>
              <pre className="mt-2 text-[10px] bg-secondary rounded-lg p-3 overflow-x-auto max-h-64">{JSON.stringify(validation.raw, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}