#!/usr/bin/env node
// Injects every hashed JS/CSS file from dist/assets into the service worker's
// APP_SHELL_FILES precache list. Without this, only the shell HTML/manifest/icons
// get precached at SW install time — the actual app bundle only gets cached
// opportunistically after being fetched once online, which means a fresh
// offline launch (or a launch right after an update, before the new chunks
// were fetched) can leave index.html cached but its JS unreachable, so the
// app never mounts and the splash screen never clears.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const DIST = 'dist';
const ASSETS_DIR = join(DIST, 'assets');
const SW_PATH = join(DIST, 'sw.js');

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out = out.concat(walk(full));
    } else if (/\.(js|css)$/.test(entry) && !entry.endsWith('.map')) {
      // Normalize to a URL path relative to dist, always forward slashes.
      out.push('/' + full.slice(DIST.length + 1).split('\\').join('/'));
    }
  }
  return out;
}

const assetFiles = walk(ASSETS_DIR).sort();
console.log(`[sw-precache] Found ${assetFiles.length} hashed asset files in ${ASSETS_DIR}`);

const swContent = readFileSync(SW_PATH, 'utf8');
const assetLines = assetFiles.map((f) => `  ${JSON.stringify(f)},`).join('\n');

const updated = swContent.replace(
  /(const APP_SHELL_FILES = \[[\s\S]*?)\n\];/,
  (match, p1) => `${p1}\n${assetLines}\n];`
);

if (updated === swContent) {
  console.error('[sw-precache] ERROR: Could not find APP_SHELL_FILES array in dist/sw.js — injection failed!');
  process.exit(1);
}

writeFileSync(SW_PATH, updated);
console.log(`[sw-precache] Injected ${assetFiles.length} asset files into APP_SHELL_FILES in ${SW_PATH}`);
