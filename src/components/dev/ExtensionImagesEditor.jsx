import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, Save, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

// Mirrors the hardcoded defaults in ExtensionPage.jsx.
const DEFAULT_HERO_ICON = 'https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/679d87279_icon128.png';
const DEFAULT_MOCKUPS = [
  { src: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/426f5c30f_Screenshot2026-08-16012745.png', label: 'Results' },
  { src: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/2d3c47491_Screenshot2026-08-16012601.png', label: 'Read' },
  { src: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/64c3a9b7b_Screenshot2026-08-16012624.png', label: 'Gospel' },
  { src: 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/6ed4814da_Screenshot2026-08-16012656.png', label: 'Resources' },
];

export default function ExtensionImagesEditor() {
  const [cfg, setCfg] = useState(null);
  const [heroIcon, setHeroIcon] = useState(DEFAULT_HERO_ICON);
  const [mockups, setMockups] = useState(DEFAULT_MOCKUPS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const heroFileRef = useRef(null);
  const mockupFileRefs = useRef([]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.ExtensionConfig.list('-updated_date', 1);
      const row = rows[0] || null;
      setCfg(row);
      setHeroIcon(row?.hero_icon || DEFAULT_HERO_ICON);
      setMockups(row?.mockups?.length ? row.mockups : DEFAULT_MOCKUPS);
    } catch (err) {
      setMsg('Load failed: ' + (err.message || 'unknown'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const uploadHero = async (e) => {
    const file = e.target.files?.[0];
    if (heroFileRef.current) heroFileRef.current.value = '';
    if (!file) return;
    setBusy('Uploading hero icon…');
    setMsg('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setHeroIcon(file_url);
      setMsg('Hero icon uploaded. Click Save to apply.');
    } catch (err) {
      setMsg('Upload failed: ' + (err.message || 'unknown'));
    }
    setBusy('');
  };

  const uploadMockup = async (index, e) => {
    const file = e.target.files?.[0];
    if (mockupFileRefs.current[index]) mockupFileRefs.current[index].value = '';
    if (!file) return;
    setBusy(`Uploading ${mockups[index].label}…`);
    setMsg('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMockups((prev) => prev.map((m, i) => (i === index ? { ...m, src: file_url } : m)));
      setMsg('Image uploaded. Click Save to apply.');
    } catch (err) {
      setMsg('Upload failed: ' + (err.message || 'unknown'));
    }
    setBusy('');
  };

  const save = async () => {
    setBusy('Saving…');
    setMsg('');
    try {
      const res = await base44.functions.invoke('saveExtensionConfig', { hero_icon: heroIcon, mockups });
      if (res?.data?.config) setCfg(res.data.config);
      setMsg('Saved. The /extension page will use these images for all users.');
    } catch (err) {
      setMsg('Save failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
    setBusy('');
  };

  const revert = async () => {
    if (!confirm('Remove the saved images and revert /extension to the built-in defaults?')) return;
    setBusy('Reverting…');
    setMsg('');
    try {
      await base44.functions.invoke('saveExtensionConfig', { hero_icon: '', mockups: [] });
      setHeroIcon(DEFAULT_HERO_ICON);
      setMockups(DEFAULT_MOCKUPS);
      setMsg('Reverted to default images.');
    } catch (err) {
      setMsg('Revert failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
    setBusy('');
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary/70" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">Hero icon</p>
          <p className="font-sans text-xs text-muted-foreground mt-1">Shown at the top of the /extension page.</p>
        </div>
        <div className="flex items-center gap-4">
          <img src={heroIcon} alt="Hero icon" className="w-16 h-16 rounded-2xl border border-border object-cover" />
          <input ref={heroFileRef} type="file" accept="image/*" onChange={uploadHero} className="hidden" />
          <button onClick={() => heroFileRef.current?.click()} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">Sidebar preview mockups</p>
          <p className="font-sans text-xs text-muted-foreground mt-1">The 4 screenshots shown in "See It In Action" on /extension.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {mockups.map((m, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <img src={m.src} alt={m.label} className="w-full aspect-[9/16] object-cover rounded-lg border border-border bg-secondary/40" />
              <p className="text-xs font-medium text-foreground">{m.label}</p>
              <input ref={(el) => (mockupFileRefs.current[i] = el)} type="file" accept="image/*" onChange={(e) => uploadMockup(i, e)} className="hidden" />
              <button onClick={() => mockupFileRefs.current[i]?.click()} disabled={!!busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-accent/20 disabled:opacity-50">
                <Upload className="w-3.5 h-3.5" /> Replace
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
          <Save className="w-4 h-4" /> Save
        </button>
        <button onClick={revert} disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> Revert to defaults
        </button>
      </div>

      {busy && <p className="text-xs text-primary flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {busy}</p>}
      {msg && (
        <p className={`text-xs flex items-center gap-1.5 ${msg.startsWith('Save failed') || msg.startsWith('Revert failed') || msg.startsWith('Load failed') || msg.startsWith('Upload failed') ? 'text-destructive' : 'text-primary'}`}>
          {msg.startsWith('Save failed') || msg.startsWith('Revert failed') || msg.startsWith('Load failed') || msg.startsWith('Upload failed')
            ? <AlertCircle className="w-3.5 h-3.5" />
            : <CheckCircle2 className="w-3.5 h-3.5" />}
          {msg}
        </p>
      )}
    </div>
  );
}