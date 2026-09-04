import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, Square, Crop } from 'lucide-react';

export default function ImageCropper({ image, onCrop, onCancel, positionMode = 'center', initialCrop, initialZoom, initialAspect }) {
  const [crop, setCrop] = useState(initialCrop || { x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialZoom || 1);
  const [aspect, setAspect] = useState(
    initialAspect !== undefined ? initialAspect : (positionMode === 'portrait' ? 9/16 : positionMode === 'landscape' ? 16/9 : 1)
  );
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const { width, height, x, y } = croppedAreaPixels;
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
      
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onCrop(croppedDataUrl, { crop, zoom, aspect });
    } catch (err) {
      console.error('Crop failed:', err);
      alert('Failed to crop image');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style={{ width: '100vw', height: '100vh', top: 0, left: 0 }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }}
    >
      <div 
        className="bg-card rounded-2xl p-4 w-full max-w-lg my-auto"
        onClick={(e) => { e.stopPropagation(); }}
        onTouchEnd={(e) => { e.stopPropagation(); }}
        onMouseDown={(e) => { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Image
          </h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              onCancel();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              onCancel();
            }}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Aspect Ratio Selector */}
        <div className="flex gap-2 mb-4">
          {[
            { label: '1:1', value: 1, icon: Square },
            { label: '4:3', value: 4/3 },
            { label: '16:9', value: 16/9 },
            { label: 'Free', value: undefined },
          ].map(opt => (
            <button
              key={opt.label}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                setAspect(opt.value);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                setAspect(opt.value);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-sans text-xs font-medium transition-colors ${
                aspect === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent/20'
              }`}
            >
              {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>
        
        {/* Cropper */}
        <div className="relative mb-4 rounded-xl overflow-hidden bg-secondary h-[40vh] max-h-[300px] min-h-[200px]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={true}
            cropSize={aspect ? undefined : undefined}
          />
        </div>
        
        {/* Zoom Slider */}
        <div className="flex items-center gap-3 mb-4">
          <span className="font-sans text-xs text-muted-foreground shrink-0">Zoom</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span className="font-sans text-xs text-muted-foreground w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              onCancel();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              onCancel();
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-sans text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              handleCrop();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              handleCrop();
            }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-sans text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Crop & Save
          </button>
        </div>
      </div>
    </div>
  );
}