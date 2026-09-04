import React, { useEffect, useState } from 'react';
import { isNativeAndroid } from '@/lib/isNativeAndroid';

// Displays the full King James Bible plain-text inline in the browser at
// /bible.txt — fetches the hosted file and renders it as text (not a download).
const BIBLE_TXT_URL = 'https://media.base44.com/files/public/6a05d76723afe58d80c589e8/9b0c1d939_bible.txt';

// On native Android, the exact same Pure Cambridge Edition text is bundled
// natively into the APK (android/app/src/main/assets/bible/pce-bible.txt,
// served locally by MainActivity.java for this same-origin path -- see
// bibleCache.js, which already uses this exact pattern for the main reading
// experience). Without this, this specific page had NO offline fallback at
// all -- a genuinely first-ever-offline launch, or any connectivity hiccup,
// left it stuck on a bare "Error: ..." with nothing to show, even though
// the full Bible text was sitting right there in the app the whole time.
const NATIVE_BIBLE_TXT_URL = '/__native/pce-bible.txt';

export default function BibleTxt() {
  const [text, setText] = useState('Loading the full Bible…');

  useEffect(() => {
    let active = true;
    (async () => {
      if (isNativeAndroid()) {
        try {
          const res = await fetch(NATIVE_BIBLE_TXT_URL);
          if (!res.ok) throw new Error(`Server returned ${res.status}`);
          const t = await res.text();
          if (active) setText(t);
          return;
        } catch {
          // Fall through to the live URL below -- e.g. if the bundled
          // interception somehow isn't wired up for this exact build.
        }
      }
      try {
        const res = await fetch(BIBLE_TXT_URL);
        const t = await res.text();
        if (active) setText(t);
      } catch (err) {
        if (active) setText('Error: ' + err.message);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <pre
      style={{
        margin: 0,
        padding: '16px',
        fontFamily: 'monospace',
        fontSize: '14px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: '#fff',
        color: '#000',
        minHeight: '100vh',
      }}
    >
      {text}
    </pre>
  );
}
