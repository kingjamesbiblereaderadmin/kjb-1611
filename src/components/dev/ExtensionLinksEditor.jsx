import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RotateCcw, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

// Built-in defaults mirror the hardcoded values in ExtensionPage.jsx so an
// admin can see what's currently live and easily reset to them.
const DEFAULTS = {
  chrome: 'https://chromewebstore.google.com/detail/kjb-reader-sidepanel/gbnipepkpenjgdpjfepgcgddmgbofmah',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/kjb-reader-sidepanel/bphmmbiepbhfnfijaapbmpimkkjdceee',
  firefox: 'https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/580bbb860_kjb-reader-v04138-firefox.zip',
  opera: 'https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/0889d0997_kjb-reader-v04138-opera.zip',
  version: 'v0.4.138',
  show_instructions: true,
};

const FIELDS = [
  { key: 'version', label: 'Version label', placeholder: 'v0.4.138' },
  { key: 'chrome', label: 'Chrome download URL', placeholder: DEFAULTS.chrome },
  { key: 'edge', label: 'Edge download URL', placeholder: DEFAULTS.edge },
  { key: 'firefox', label: 'Firefox download URL', placeholder: DEFAULTS.firefox },
  { key: 'opera', label: 'Opera download URL', placeholder: DEFAULTS.opera },
];

export default function ExtensionLinksEditor() {
  const [cfg, setCfg] = useState(null);
  const [values, setValues] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.ExtensionConfig.list('-updated_date', 1);
      const row = rows[0] || null;
      setCfg(row);
      setValues({
        chrome: row?.chrome || DEFAULTS.chrome,
        edge: row?.edge || DEFAULTS.edge,
        firefox: row?.firefox || DEFAULTS.firefox,
        opera: row?.opera || DEFAULTS.opera,
        version: row?.version || DEFAULTS.version,
        show_instructions: row?.show_instructions !== false,
      });
    } catch (err) {
      setMsg('Load failed: ' + (err.message || 'unknown'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await base44.functions.invoke('saveExtensionConfig', values);
      if (res?.data?.config) setCfg(res.data.config);
      setMsg('Saved. The /extension page will use these links for all users.');
    } catch (err) {
      setMsg('Save failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
    setBusy(false);
  };

  const revert = async () => {
    if (!confirm('Remove the saved config and revert /extension to the built-in defaults?')) return;
    setBusy(true);
    setMsg('');
    try {
      await base44.functions.invoke('saveExtensionConfig', { revert: true });
      setCfg(null);
      setValues(DEFAULTS);
      setMsg('Reverted to defaults.');
    } catch (err) {
      setMsg('Revert failed: ' + (err?.response?.data?.error || err.message || 'unknown'));
    }
    setBusy(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary/70" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div>
          <p className="font-sans text-sm font-semibold text-foreground">Extension download links</p>
          <p className="font-sans text-xs text-muted-foreground mt-1">
            These URLs power the download buttons on the <code className="px-1 py-0.5 rounded bg-secondary text-foreground">/extension</code> page. Leave a field blank to fall back to the built-in default.
          </p>
        </div>

        <div className="space-y-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="font-sans text-xs font-medium text-foreground">{f.label}</label>
              <input
                type="text"
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:border-accent outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 pt-1">
          <div>
            <p className="font-sans text-sm font-medium text-foreground">Show installation instructions</p>
            <p className="font-sans text-xs text-muted-foreground">Display the step-by-step install guide on /extension</p>
          </div>
          <Switch
            checked={values.show_instructions}
            onCheckedChange={(checked) => setValues((v) => ({ ...v, show_instructions: checked }))}
            className="shrink-0"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
          </button>
          <button onClick={revert} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-destructive text-sm font-medium hover:bg-destructive/10 disabled:opacity-50">
            <RotateCcw className="w-4 h-4" /> Revert to defaults
          </button>
          <a href="/extension" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-accent/20">
            <ExternalLink className="w-4 h-4" /> View page
          </a>
        </div>

        {busy && <p className="text-xs text-primary flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</p>}
        {msg && (
          <p className={`text-xs flex items-center gap-1.5 ${msg.startsWith('Save failed') || msg.startsWith('Revert failed') || msg.startsWith('Load failed') ? 'text-destructive' : 'text-primary'}`}>
            {msg.startsWith('Save failed') || msg.startsWith('Revert failed') || msg.startsWith('Load failed')
              ? <AlertCircle className="w-3.5 h-3.5" />
              : <CheckCircle2 className="w-3.5 h-3.5" />}
            {msg}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border p-4">
        <p className="font-sans text-xs text-muted-foreground">
          {cfg
            ? 'A custom config is saved and live on /extension.'
            : 'No custom config saved — /extension is using the built-in defaults.'}
        </p>
      </div>
    </div>
  );
}