import React, { useState, useRef } from 'react';
import { Upload, Download, Copy, CheckCircle2, AlertCircle, Smartphone, Monitor, GripVertical, Crop, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ImageCropper from '@/components/bible/ImageCropper';

function resizeImage(file, targetWidth, targetHeight) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const ratio = Math.min(targetWidth / width, targetHeight / height);
        if (ratio < 1) {
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#0f1117';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;
        ctx.drawImage(img, x, y, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], `screenshot-${file.name}`, { type: 'image/png' }));
          else reject(new Error('Canvas conversion failed'));
        }, 'image/png', 0.95);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ManifestScreenshots() {
  const [mobileUploads, setMobileUploads] = useState([]);
  const [desktopUploads, setDesktopUploads] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [cropForUpload, setCropForUpload] = useState(null);
  const mobileFileRef = useRef(null);
  const desktopFileRef = useRef(null);

  const handleFileUpload = async (file, type) => {
    setUploading(true);
    try {
      const targetWidth = type === 'mobile' ? 1024 : 1920;
      const targetHeight = type === 'mobile' ? 1707 : 1080;
      const resizedFile = await resizeImage(file, targetWidth, targetHeight);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: resizedFile });
      const newUpload = {
        id: Date.now(),
        type,
        url: file_url,
        fileName: file.name,
        resizedSize: `${targetWidth}x${targetHeight}`,
        timestamp: new Date().toLocaleString(),
      };
      if (type === 'mobile') setMobileUploads(prev => [...prev, newUpload]);
      else setDesktopUploads(prev => [...prev, newUpload]);
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
    setUploading(false);
  };

  const handleCropUpload = async (croppedDataUrl, type) => {
    setUploading(true);
    try {
      console.log('[Crop] Starting crop upload for type:', type);
      console.log('[Crop] Data URL length:', croppedDataUrl.length);
      
      if (!croppedDataUrl || !croppedDataUrl.includes(',')) {
        throw new Error('Invalid cropped image data');
      }
      
      const [meta, b64] = croppedDataUrl.split(',');
      const mime = meta.match(/:(.*?);/)?.[1] || 'image/png';
      console.log('[Crop] MIME type:', mime);
      
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const file = new File([arr], `cropped-screenshot-${type}.png`, { type: mime });
      console.log('[Crop] File size:', file.size, 'bytes');
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      console.log('[Crop] Upload successful, URL:', file_url);
      
      const targetWidth = type === 'mobile' ? 1024 : 1920;
      const targetHeight = type === 'mobile' ? 1707 : 1080;
      const newUpload = {
        id: Date.now(),
        type,
        url: file_url,
        fileName: 'Cropped screenshot',
        resizedSize: `${targetWidth}x${targetHeight}`,
        timestamp: new Date().toLocaleString(),
      };
      if (type === 'mobile') setMobileUploads(prev => [...prev, newUpload]);
      else setDesktopUploads(prev => [...prev, newUpload]);
      setCropImage(null);
      setCropForUpload(null);
      alert('Screenshot cropped and uploaded successfully!');
    } catch (e) {
      console.error('[Crop] Error:', e);
      alert('Crop failed: ' + e.message);
    }
    setUploading(false);
  };

  const handleDragEnd = (result, type) => {
    if (!result.destination) return;
    const items = type === 'mobile' ? [...mobileUploads] : [...desktopUploads];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    if (type === 'mobile') setMobileUploads(items);
    else setDesktopUploads(items);
  };

  const handleDelete = (id, type) => {
    if (type === 'mobile') setMobileUploads(prev => prev.filter(u => u.id !== id));
    else setDesktopUploads(prev => prev.filter(u => u.id !== id));
  };

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const downloadImage = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const allUploads = [...mobileUploads, ...desktopUploads];

  return (
    <div className="w-full max-w-[120rem] mx-auto px-5 sm:px-8 pt-10 pb-32">
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Manifest Screenshots</h1>
        <p className="font-sans text-sm text-muted-foreground">Upload, crop, and rearrange PWA manifest screenshots</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-sans text-sm text-foreground font-medium">Screenshot Requirements</p>
            <ul className="font-sans text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Mobile:</strong> 9:16 aspect ratio, auto-resized to 1024x1707px</li>
              <li><strong>Desktop:</strong> 16:9 aspect ratio, auto-resized to 1920x1080px</li>
              <li>Format: PNG or JPG (converted to PNG)</li>
              <li>Maximum file size: 5MB per image</li>
              <li>Chrome Android shows only the first narrow screenshot in install prompt</li>
              <li>Drag screenshots to rearrange their order in the manifest</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Section */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">Mobile Screenshots</h2>
            <p className="font-sans text-xs text-muted-foreground">Portrait screenshots for mobile devices</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <input ref={mobileFileRef} type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'mobile');
              e.target.value = '';
            }} disabled={uploading} className="hidden" />
            <button onClick={() => mobileFileRef.current?.click()} disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-3 px-4 py-12 border-2 border-dashed border-border rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer disabled:opacity-60">
              {uploading ? (
                <><div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="font-sans text-xs text-muted-foreground">Uploading...</p></>
              ) : (
                <><Upload className="w-6 h-6 text-muted-foreground" /><div className="text-center"><p className="font-sans text-sm text-foreground font-medium">Click to upload mobile screenshot</p><p className="font-sans text-xs text-muted-foreground mt-1">Auto-resized to 1024x1707 (9:16)</p></div></>
              )}
            </button>
          </div>
          <div className="space-y-3">
            <p className="font-sans text-sm font-medium text-foreground">Uploaded mobile screenshots (drag to rearrange):</p>
            {mobileUploads.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground italic">No screenshots uploaded yet</p>
            ) : (
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'mobile')}>
                <Droppable droppableId="mobile-screenshots">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 max-h-96 overflow-y-auto">
                      {mobileUploads.map((upload, idx) => (
                        <Draggable key={upload.id} draggableId={String(upload.id)} index={idx}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps}
                              className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                              <div {...provided.dragHandleProps} className="flex items-center justify-center w-8 text-muted-foreground cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="w-20 h-32 rounded-lg overflow-hidden bg-background shrink-0">
                                <img src={upload.url} alt={upload.fileName} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="font-sans text-xs font-medium text-foreground truncate">{upload.fileName}</p>
                                <p className="font-sans text-[10px] text-muted-foreground">Resized to {upload.resizedSize}</p>
                                <p className="font-sans text-[10px] text-muted-foreground">{upload.timestamp}</p>
                                <div className="flex gap-2 flex-wrap">
                                  <button onClick={() => copyToClipboard(upload.url)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-sans text-muted-foreground hover:text-foreground transition-colors">
                                    <Copy className="w-3 h-3" /> Copy
                                  </button>
                                  <button onClick={() => downloadImage(upload.url, `screenshot-mobile-${idx + 1}.png`)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-sans text-muted-foreground hover:text-foreground transition-colors">
                                    <Download className="w-3 h-3" /> Download
                                  </button>
                                  <button onClick={() => { setCropImage(upload.url); setCropForUpload('mobile'); }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-sans text-muted-foreground hover:text-foreground transition-colors">
                                    <Crop className="w-3 h-3" /> Crop
                                  </button>
                                  <button onClick={() => handleDelete(upload.id, 'mobile')} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-destructive text-destructive text-[10px] font-sans hover:bg-destructive/10 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Section */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Monitor className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">Desktop Screenshots</h2>
            <p className="font-sans text-xs text-muted-foreground">Landscape screenshots for desktop/tablet</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <input ref={desktopFileRef} type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file, 'desktop');
              e.target.value = '';
            }} disabled={uploading} className="hidden" />
            <button onClick={() => desktopFileRef.current?.click()} disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-3 px-4 py-12 border-2 border-dashed border-border rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer disabled:opacity-60">
              {uploading ? (
                <><div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="font-sans text-xs text-muted-foreground">Uploading...</p></>
              ) : (
                <><Upload className="w-6 h-6 text-muted-foreground" /><div className="text-center"><p className="font-sans text-sm text-foreground font-medium">Click to upload desktop screenshot</p><p className="font-sans text-xs text-muted-foreground mt-1">Auto-resized to 1920x1080 (16:9)</p></div></>
              )}
            </button>
          </div>
          <div className="space-y-3">
            <p className="font-sans text-sm font-medium text-foreground">Uploaded desktop screenshots (drag to rearrange):</p>
            {desktopUploads.length === 0 ? (
              <p className="font-sans text-xs text-muted-foreground italic">No screenshots uploaded yet</p>
            ) : (
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'desktop')}>
                <Droppable droppableId="desktop-screenshots">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3 max-h-96 overflow-y-auto">
                      {desktopUploads.map((upload, idx) => (
                        <Draggable key={upload.id} draggableId={String(upload.id)} index={idx}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps}
                              className="flex gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                              <div {...provided.dragHandleProps} className="flex items-center justify-center w-8 text-muted-foreground cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="w-32 h-20 rounded-lg overflow-hidden bg-background shrink-0">
                                <img src={upload.url} alt={upload.fileName} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="font-sans text-xs font-medium text-foreground truncate">{upload.fileName}</p>
                                <p className="font-sans text-[10px] text-muted-foreground">Resized to {upload.resizedSize}</p>
                                <p className="font-sans text-[10px] text-muted-foreground">{upload.timestamp}</p>
                                <div className="flex gap-2 flex-wrap">
                                  <button onClick={() => copyToClipboard(upload.url)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-sans text-muted-foreground hover:text-foreground transition-colors">
                                    <Copy className="w-3 h-3" /> Copy
                                  </button>
                                  <button onClick={() => downloadImage(upload.url, `screenshot-desktop-${idx + 1}.png`)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-sans text-muted-foreground hover:text-foreground transition-colors">
                                    <Download className="w-3 h-3" /> Download
                                  </button>
                                  <button onClick={() => { setCropImage(upload.url); setCropForUpload('desktop'); }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-sans text-muted-foreground hover:text-foreground transition-colors">
                                    <Crop className="w-3 h-3" /> Crop
                                  </button>
                                  <button onClick={() => handleDelete(upload.id, 'desktop')} className="flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-destructive text-destructive text-[10px] font-sans hover:bg-destructive/10 transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropImage && (
        <ImageCropper
          image={cropImage}
          onCrop={(croppedDataUrl) => handleCropUpload(croppedDataUrl, cropForUpload)}
          onCancel={() => { setCropImage(null); setCropForUpload(null); }}
          positionMode={cropForUpload === 'mobile' ? 'portrait' : 'landscape'}
        />
      )}

      {/* Manifest Integration */}
      {allUploads.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 mt-8 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-semibold text-foreground">Manifest Code</h2>
            <button onClick={() => copyToClipboard(`screenshots: [
${allUploads.map((u, i) => `  {
    src: "${u.url}",
    sizes: "${u.type === 'mobile' ? '1024x1707' : '1920x1080'}",
    type: "image/png",
    form_factor: "${u.type === 'mobile' ? 'narrow' : 'wide'}",
    label: "Screenshot ${i + 1}"
  }`).join(',\n')}
]`)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              <CheckCircle2 className="w-4 h-4" /> Copy Code
            </button>
          </div>
          <p className="font-sans text-sm text-muted-foreground mb-4">Order matches your screenshot arrangement above:</p>
          <pre className="bg-secondary/50 rounded-xl p-4 overflow-x-auto text-xs font-mono text-foreground">
            {`screenshots: [
${allUploads.map((u, i) => `  {
    src: "${u.url}",
    sizes: "${u.type === 'mobile' ? '1024x1707' : '1920x1080'}",
    type: "image/png",
    form_factor: "${u.type === 'mobile' ? 'narrow' : 'wide'}",
    label: "Screenshot ${i + 1}"
  }`).join(',\n')}
]`}
          </pre>
        </div>
      )}
    </div>
  );
}