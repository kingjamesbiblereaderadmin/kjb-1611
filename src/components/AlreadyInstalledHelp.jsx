import React from 'react';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => /android/i.test(navigator.userAgent);
const isMac = () => /Macintosh|Mac OS X/i.test(navigator.userAgent) && !/iphone|ipad|ipod/i.test(navigator.userAgent);
const isMobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);
const isEdge = () => /edg/i.test(navigator.userAgent);

// Bullet-point, browser-specific instructions for finding an app that's
// already installed on this device (shown under the manual install guide).
export default function AlreadyInstalledHelp() {
  let bullets = [];

  if (isIOS()) {
    bullets = [
      'Home Screen — swipe through your home screen pages to look for "KJB Reader".',
      'App Library — swipe left past your last home screen page and search there.',
    ];
  } else if (isAndroid()) {
    bullets = [
      'Home screen — check if the icon is already there.',
      'App drawer — swipe up from the home screen to see all installed apps.',
    ];
  } else if (isMac()) {
    bullets = [
      'Launchpad — check for "KJB Reader" among your apps.',
      'Finder → Applications — look for a "Chrome Apps" or "Edge Apps" folder.',
    ];
  } else if (isEdge()) {
    bullets = [
      'Start Menu — search "KJB Reader" or check "Recently added".',
      'Type edge://apps in the address bar to see all installed web apps.',
    ];
  } else {
    bullets = [
      'Start Menu / taskbar — search "KJB Reader" or check "Recently added".',
      'Type chrome://apps in the address bar to see all installed web apps.',
    ];
  }

  return (
    <div className="mt-2">
      <p className="font-sans text-xs font-medium text-foreground">
        Already installed? Look for "KJB Reader" in:
      </p>
      <ul className="mt-1 space-y-1 list-disc list-inside">
        {bullets.map((b) => (
          <li key={b} className="font-sans text-xs text-muted-foreground leading-snug">{b}</li>
        ))}
      </ul>
    </div>
  );
}