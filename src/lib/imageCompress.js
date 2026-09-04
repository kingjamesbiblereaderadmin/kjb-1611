// Compresses an image file down to under maxBytes, without ever rejecting
// the upload. Strategy: re-encode as JPEG, first lowering quality in steps;
// if quality alone can't get under the limit, start shrinking dimensions too
// (with quality bumped back up a bit, since a smaller image can afford
// higher quality at the same file size). Files already under the limit are
// read as-is with no re-encoding, so small/already-optimized images aren't
// needlessly degraded.
export function shrinkImageUnderLimit(file, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (file.size <= maxBytes) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        const maxDim = 2400; // cap the starting size so huge photos need fewer passes
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        let quality = 0.9;
        let blob = null;
        for (let attempt = 0; attempt < 14; attempt++) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          // eslint-disable-next-line no-await-in-loop
          blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
          if (!blob) break;
          if (blob.size <= maxBytes) break;
          if (quality > 0.5) {
            quality -= 0.1;
          } else {
            width = Math.round(width * 0.85);
            height = Math.round(height * 0.85);
            quality = 0.7;
          }
        }

        URL.revokeObjectURL(objectUrl);
        if (!blob) { reject(new Error('Could not process image')); return; }

        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to finalize compressed image'));
        reader.readAsDataURL(blob);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
}
