// Auto-crops/pads an image to a square PNG at a target size, entirely in the
// browser via <canvas>. For maskable icons it shrinks the artwork into a safe
// zone (centered) so Android's circular mask never clips it. Returns a Blob.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// dataUrl: source image (data URL or same-origin URL)
// size: output width/height in px (e.g. 512)
// maskable: if true, pad artwork to ~80% safe zone on a solid background
// bgColor: background fill for transparent/maskable areas
export async function autoCropIcon(dataUrl, size, { maskable = false, bgColor = '#0f1117' } = {}) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Fill background (matters for maskable + transparent PNGs)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  // Center-crop source to a square first
  const srcSquare = Math.min(img.width, img.height);
  const sx = (img.width - srcSquare) / 2;
  const sy = (img.height - srcSquare) / 2;

  // Maskable: draw into 80% safe zone, centered. Otherwise fill the canvas.
  const scale = maskable ? 0.8 : 1;
  const drawSize = size * scale;
  const offset = (size - drawSize) / 2;

  ctx.drawImage(img, sx, sy, srcSquare, srcSquare, offset, offset, drawSize, drawSize);

  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// Convenience: crop then return a File for upload
export async function autoCropIconFile(dataUrl, size, opts) {
  const blob = await autoCropIcon(dataUrl, size, opts);
  return new File([blob], `icon-${size}${opts?.maskable ? '-maskable' : ''}.png`, { type: 'image/png' });
}