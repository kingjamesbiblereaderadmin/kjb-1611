// Same-origin PWA icon proxy.
// The published app lives on kingjamesbiblereader.com, but the icon images are
// stored on base44.app (cross-origin). When a user adds the PWA to their home
// screen, the mobile OS fetches the manifest icon DIRECTLY — not through the
// service worker. Cross-origin icon fetches can time out or fail on flaky
// mobile networks, leaving the installed app with a blank / default icon.
// This function serves the same images from the app's OWN origin
// (/functions/pwaIcon?size=192|512|maskable|sig|sig2) so the icon is always
// reachable, with immutable cache headers so the OS only fetches it once.
//
// The launcher icons (192/512/maskable) use the user's HAND-DRAWN "KJB Reader"
// signature logo. The source is only 141×141 — too small for the Play Store's
// ≥512 requirement — so the function decodes it and bilinear-upscales it to a
// genuine 512×512 PNG. App stores / PWABuilder sniff the file's actual magic
// bytes (not the Content-Type header), so we always re-encode to real PNG
// regardless of the upstream format (the source can be PNG or JPEG).
//
// PNG decode/encode uses UPNG.js (pure JS via pako) because pngjs's zlib
// Inflate cannot be instantiated under Deno's Node-zlib interop.

import { Buffer } from 'node:buffer';
import UPNG from 'npm:upng-js@2.1.0';
import jpegjs from 'npm:jpeg-js@0.4.4';

// The user's hand-drawn signature logo (also served raw at 141×141 via ?size=sig).
const SIGNATURE_URL = 'https://media.base44.com/images/public/6a05d76723afe58d80c589e8/2279e016e_8e738d108_cfb4bf781_Untitled.png';

const ICONS = {
  // Launcher sizes — the signature, upscaled to 512×512 in-function.
  '192': SIGNATURE_URL,
  '512': SIGNATURE_URL,
  'maskable': SIGNATURE_URL,
  // Signature logos served at their true 141×141 size (extra "any" entries so
  // the user's signature artwork is present in the PWA icon set).
  'sig': SIGNATURE_URL,
  'sig2': 'https://media.base44.com/images/public/6a8011c360ff52dad38eb2f3/c72c2e0d1_8e738d108_cfb4bf781_Untitled.png',
};

const LAUNCHER_SIZE = 512;          // target square edge for 192/512/maskable
const LAUNCHER_SIZES = new Set(['192', '512', 'maskable']);

// Module-level byte cache so repeated requests don't re-fetch + re-encode.
const pngCache = new Map();

// PNG magic: 89 50 4E 47 ; JPEG magic: FF D8 FF
function isPng(b: Uint8Array): boolean {
  return b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
}
function isJpeg(b: Uint8Array): boolean {
  return b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
}

// Decode arbitrary upstream image bytes into RGBA { width, height, data }.
function decodeToRgba(bytes: Uint8Array): { width: number; height: number; data: Uint8Array } {
  if (isPng(bytes)) {
    const img = UPNG.decode(bytes);
    const frames = UPNG.toRGBA8(img);      // array of Uint8Array (one per frame)
    const rgba = frames[0];
    if (!rgba) throw new Error('png decode produced no frame');
    return { width: img.width, height: img.height, data: new Uint8Array(rgba) };
  }
  if (isJpeg(bytes)) {
    const raw = jpegjs.decode(Buffer.from(bytes), { useTArray: true, formatAsRGBA: true });
    if (!raw || !raw.width || !raw.height) throw new Error('jpeg decode failed');
    return { width: raw.width, height: raw.height, data: new Uint8Array(raw.data) };
  }
  throw new Error('unsupported image format (not PNG or JPEG)');
}

// Bilinear-upscale an RGBA buffer to dstW×dstH. Keeps the user's artwork
// (no AI substitution) while meeting the store's ≥512 size rule.
function upscaleBilinear(src: Uint8Array, srcW: number, srcH: number, dstW: number, dstH: number): Uint8Array {
  const dst = new Uint8Array(dstW * dstH * 4);
  const xRatio = (srcW - 1) / Math.max(1, dstW - 1);
  const yRatio = (srcH - 1) / Math.max(1, dstH - 1);
  for (let y = 0; y < dstH; y++) {
    const sy = y * yRatio;
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = sy - y0;
    for (let x = 0; x < dstW; x++) {
      const sx = x * xRatio;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = sx - x0;
      const i00 = (y0 * srcW + x0) * 4;
      const i01 = (y0 * srcW + x1) * 4;
      const i10 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;
      const di = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = src[i00 + c] * (1 - fx) + src[i01 + c] * fx;
        const bot = src[i10 + c] * (1 - fx) + src[i11 + c] * fx;
        dst[di + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return dst;
}

async function getPngBytes(size: string): Promise<Uint8Array> {
  if (pngCache.has(size)) return pngCache.get(size);
  const target = ICONS[size] || ICONS['512'];
  const res = await fetch(target);
  if (!res.ok) throw new Error('upstream status ' + res.status);
  const buf = await res.arrayBuffer();
  const { width, height, data } = decodeToRgba(new Uint8Array(buf));

  let outW = width, outH = height, outData = data;
  if (LAUNCHER_SIZES.has(size)) {
    outW = LAUNCHER_SIZE; outH = LAUNCHER_SIZE;
    outData = upscaleBilinear(data, width, height, outW, outH);
  }

  // UPNG.encode(frames, w, h, cpc): frames = array of RGBA ArrayBuffers, cpc 0 = RGBA.
  const pngBytes = new Uint8Array(UPNG.encode([outData.buffer], outW, outH, 0));
  pngCache.set(size, pngBytes);
  return pngBytes;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const size = (url.searchParams.get('size') || '512').toLowerCase();
  try {
    const png = await getPngBytes(size);
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    console.error('[pwaIcon]', e?.message, e?.stack);
    return new Response('icon unavailable', { status: 502 });
  }
});