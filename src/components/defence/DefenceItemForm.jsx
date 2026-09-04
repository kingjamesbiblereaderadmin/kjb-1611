import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Presentational add/edit form for a DefenceResource. The parent handles the
// actual create/update API call via onSubmit(values).
export default function DefenceItemForm({ initialItem, existingCategories, onSubmit, onCancel, saving }) {
  const [category, setCategory] = useState(initialItem?.category || '');
  const [title, setTitle] = useState(initialItem?.title || '');
  const [desc, setDesc] = useState(initialItem?.desc || '');
  const [url, setUrl] = useState(initialItem?.url || '');
  const [label, setLabel] = useState(initialItem?.label || '');
  const [order, setOrder] = useState(String(initialItem?.order ?? 0));
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialItem) {
      setCategory(initialItem.category || '');
      setTitle(initialItem.title || '');
      setDesc(initialItem.desc || '');
      setUrl(initialItem.url || '');
      setLabel(initialItem.label || '');
      setOrder(String(initialItem.order ?? 0));
    }
  }, [initialItem]);

  const submit = (e) => {
    e.preventDefault();
    if (!category.trim() || !title.trim() || !desc.trim() || !url.trim()) {
      setError('Category, title, description, and URL are required.');
      return;
    }
    setError('');
    onSubmit({
      category: category.trim(),
      title: title.trim(),
      desc: desc.trim(),
      url: url.trim(),
      label: label.trim() || (() => { try { return new URL(url.trim()).hostname.replace('www.', ''); } catch { return url.trim(); } })(),
      order: parseInt(order) || 0,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="def-cat">Category</Label>
        <Input
          id="def-cat"
          list="def-cat-list"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. KJB Defence"
          className="font-sans"
        />
        <datalist id="def-cat-list">
          {(existingCategories || []).map((c) => <option key={c} value={c} />)}
        </datalist>
        <p className="font-sans text-xs text-muted-foreground">Type a new category name or pick an existing one.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="def-title">Title</Label>
        <Input id="def-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" className="font-sans" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="def-desc">Description</Label>
        <Textarea id="def-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" className="font-sans min-h-[80px]" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="def-url">URL</Label>
        <Input id="def-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="font-sans" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="def-label">Link Label</Label>
          <Input id="def-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="domain.com" className="font-sans" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="def-order">Order</Label>
          <Input id="def-order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="font-sans" />
        </div>
      </div>
      {error && <p className="font-sans text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
          {initialItem ? 'Save Changes' : 'Add Resource'}
        </Button>
      </div>
    </form>
  );
}