import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, History, Sparkles } from 'lucide-react';

const CHANGELOG = [
  { version: 'v0.4.229', date: 'September 4, 2026', items: ['Fixed the extension blocking typing in compose boxes on Facebook and TikTok — clicks into contenteditable areas are now always left alone, even when a verse-detection hit area happened to overlap that spot', 'Fixed the sidebar opening on plain text with no Bible reference on text-dense pages like Facebook and TikTok — the scanner previously joined separate nearby elements with a single space, letting the end of one unrelated block combine with the start of another into a false match'] },
  { version: 'v0.4.228', date: 'September 2, 2026', items: ['Fixed a chapter\u2019s colophon appearing after the wrong verse when a search only covered part of the chapter (e.g. a specific verse range) instead of the chapter\u2019s true last verse', 'Fixed clicks on Facebook Messenger occasionally opening the panel on the wrong message or with no verse, caused by the browser reusing a scanned text position for new message content'] },
  { version: 'v0.4.227', date: 'September 1, 2026', items: ['Copy Selected (tick mode in Results) now includes Psalm superscriptions/Hebrew section names and epistle colophons in the copied text, matching every other copy path — it was the one path that never included them'] },
  { version: 'v0.4.226', date: 'September 1, 2026', items: ['Replaced the native book/chapter dropdowns in Read mode with custom-built popup lists — native <select> elements had unreliable click hit-testing inside Chrome side panels for some users regardless of panel size or zoom level, so this is entirely our own click handling instead'] },
  { version: 'v0.4.225', date: 'September 1, 2026', items: ['Removed the duplicate floating "Copy Selected / Cancel" bar in Results select mode — the toolbar already had its own Copy Selected/Clear, so both were doing the same thing at once', 'Made the Results toolbar (Select / Copy All) sticky while scrolling, since it lives inside the scrolling list and needs to stay reachable', 'Fixed verse text overlapping the copy/open icons in the Results chapter view by giving the verse text real reserved padding — position:absolute does not make text wrap around an element the way float does'] },
  { version: 'v0.4.224', date: 'September 1, 2026', items: ['Restored the toolbar\u2019s global "Copy All" button (copies every chapter/book group shown, clearly separated) alongside the per-group buttons added in v0.4.223'] },
  { version: 'v0.4.223', date: 'September 1, 2026', items: ['Each chapter/book group in a Results search now gets its own "Copy All" button scoped to just that group, since a single button was merging verses from different chapters/books together in mixed-reference searches (e.g. "Psalm 119:1-2, Romans 3:25")'] },
  { version: 'v0.4.222', date: 'September 1, 2026', items: ['Fixed a verse\u2019s copy/open icons floating above its group\u2019s structural heading (e.g. ALEPH) instead of beside the verse\u2019s own text', '"Copy All" in Results now only shows once there\u2019s more than one verse — a single verse\u2019s own copy button already covers it'] },
  { version: 'v0.4.221', date: 'September 1, 2026', items: ['Fixed colophon and Psalm-heading text losing its formatting when copied — italic portions are now rendered back to [bracketed] plain text individually, with the pilcrow preserved, instead of flattening everything to plain text or wrapping the whole line in brackets'] },
  { version: 'v0.4.220', date: 'September 1, 2026', items: ['A colophon is now folded into the same quoted passage as the verse it follows when copying a single verse, instead of appearing as a separate line after the reference'] },
  { version: 'v0.4.219', date: 'September 1, 2026', items: ['Fixed the Results tab\u2019s Select/Copy All toolbar staying visible after switching to the Read tab — it was only gated on whether result cards existed, not on which tab was active', 'Fixed a verse\u2019s copy/open icon floating above a preceding Psalm heading instead of beside its own text'] },
  { version: 'v0.4.218', date: 'September 1, 2026', items: ['Reverted verse-range searches (e.g. "Psalm 119:1-2") to open in Results mode rather than Read mode, so only the requested verses are shown instead of the entire chapter'] },
  { version: 'v0.4.217', date: 'September 1, 2026', items: ['Simplified Read mode to just "Copy Chapter" — removed the per-verse copy icon added in v0.4.210, along with the Select (tick) mode added in v0.4.211'] },
  { version: 'v0.4.216', date: 'September 1, 2026', items: ['Removed Read mode\u2019s Select (tick) feature in favor of the Results tab\u2019s existing, more reliable Select', 'Verse ranges now default to opening in Read mode, which has the more complete Copy Chapter'] },
  { version: 'v0.4.215', date: 'September 1, 2026', items: ['Added structural text (Psalm superscriptions, Hebrew section names, epistle colophons) and a "Copy Chapter" button to the Results tab\u2019s chapter view, matching what Read mode already had'] },
  { version: 'v0.4.214', date: 'September 1, 2026', items: ['Fixed a chapter\u2019s colophon not being included when copying its last verse', 'Fixed Select mode showing no tick boxes on chapters that render through a fallback single-block path instead of individual verses'] },
  { version: 'v0.4.213', date: 'September 1, 2026', items: ['Per-verse copy in Read mode now includes the Psalm superscription or Hebrew section name (e.g. "ALEPH") centered above the verse when present', 'Renamed the chapter copy button to "Copy Chapter" for clarity'] },
  { version: 'v0.4.212', date: 'September 1, 2026', items: ['Per-verse copy in Read mode now uses the short book name (e.g. "Psalms") instead of the full KJV chapter title (e.g. "The Book of Psalms") in the reference'] },
  { version: 'v0.4.211', date: 'September 1, 2026', items: ['Added a Select (tick) mode to Read mode with Copy Selected/Clear, alongside the existing Copy Chapter'] },
  { version: 'v0.4.210', date: 'September 1, 2026', items: ['Added a per-verse copy button to each verse in Read mode'] },
  { version: 'v0.4.209', date: 'August 29, 2026', items: ['Fixed clicking on non-verse page elements (buttons, links, text, empty space) falsely triggering the verse lookup panel. Removed an overly broad container-based hit detection fallback that matched clicks on any element that merely contained a verse reference somewhere inside it, instead of only matching clicks directly on verse text.'] },
  { version: 'v0.4.208', date: 'August 28, 2026', items: ['Copy Selected now shows a checkmark confirmation on both the toolbar button and the floating bottom bar button after copying', 'Selecting multiple verses from the same chapter now combines them into one paragraph with a range reference (e.g. \u201Cverse1 verse2 verse3\u201D - John 3:16-18 (KJB)) instead of separate entries per verse'] },
  { version: 'v0.4.205', date: 'August 27, 2026', items: ['Fixed verse reference clicks being silently swallowed on complex websites (Facebook, React apps, Bootstrap sites). The interactive-element guard was too aggressive, blocking clicks on verse text inside containers with tabindex or onclick attributes. The guard now only blocks genuinely interactive controls (buttons, selects, inputs, textarea, summary, and elements with ARIA roles like role="button")'] },
  { version: 'v0.4.204', date: 'August 25, 2026', items: ['Fixed multi-word keyword search returning no results when any word appears in 500+ verses (e.g. "holy, men, moved" now correctly finds 2 Peter 1:21)', 'Multi-word AND search now searches the rarest word first, then filters results client-side for remaining words \u2014 eliminates the API result limit that was cutting off valid matches'] },
  { version: 'v0.4.202', date: 'August 23, 2026', items: ['Updated search result copy format to use curly quotation marks around verse text with the reference after a dash: \u201Cverse text\u201D - Reference (KJB)', 'Full chapter copy remains unchanged \u2014 no quotes, verse numbers and text only'] },
  { version: 'v0.4.201', date: 'August 23, 2026', items: ['Fixed verse detection intercepting clicks on nearby buttons, dropdowns, and close (X) controls \u2014 interactive elements now work normally even when a Bible reference is nearby', 'Removed aggressive bounding box fallback that was capturing clicks within the expanded padding area of verse references', 'Added interactive element guard that skips verse detection when clicking on buttons, selects, inputs, accordion toggles, and ARIA role="button" elements'] },
  { version: 'v0.4.200', date: 'August 22, 2026', items: ['Version bump consolidating race condition fixes from v0.4.199 — first-click verse lookups now reliably display results instead of being overwritten by panel initialization', 'Updated promotional screenshots and store listing materials across all browsers'] },
  { version: 'v0.4.199', date: 'August 22, 2026', items: ['Fixed race condition where first verse click opened the side panel but search results were immediately overwritten by the last-viewed chapter — the panel now correctly displays the clicked verse on the first click', 'Added delayed retry for verse lookup delivery after side panel opens, ensuring reliable first-click search on Chrome and Edge', 'Reduced duplicate-click detection window from 800ms to 500ms for more responsive retry'] },
  { version: 'v0.4.195', date: 'August 22, 2026', items: ['Fixed verse click dead zones with forgiving hit detection — 6px horizontal and 4px vertical padding around painted text ranges, with bounding-box fallback for multi-line references', 'Resolved side panel not opening after service worker restarts by switching from stale storage flags to live port and heartbeat signals', 'Restored direct verse lookup for detected references inside hyperlinks (no choice menu)'] },
  { version: 'v0.4.194', date: 'August 22, 2026', items: ['Reverted hyperlink choice menu — verse references inside links now trigger lookups directly', 'Restored static 2 Timothy 2:15 sidebar banner with normal font-style', 'Fixed side panel activation flash by switching to promise-based sidePanel.open flow with fallback only on rejection'] },
  { version: 'v0.4.193', date: 'August 22, 2026', items: ['Re-enabled Bible reference detection inside existing hyperlinks — clicking a detected verse reference in a link now opens the KJB Reader sidebar directly', 'Fixed sidebar not opening after service worker restart — stale panel-open flag caused the background to skip opening the sidebar on verse clicks'] },
  { version: 'v0.4.192', date: 'August 22, 2026', items: ['Replaced dynamic daily verse with a static 2 Timothy 2:15 banner in the sidebar', 'Fixed Firefox-specific background.js validation warning — Chromium-only sidePanel API calls are now properly gated', 'Fixed JavaScript syntax error (stray brace) that broke sidebar parsing on AMO', 'Removed hyperlink choice menu for a cleaner click experience'] },
  { version: 'v0.4.181', date: 'August 21, 2026', items: ['Fixed overlay flash caused by incorrect Firefox detection — modern Chromium defines a `browser` alias, so the content script was taking the Firefox code path on Chrome/Edge/Opera and briefly injecting an overlay'] },
  { version: 'v0.4.184', date: 'August 19, 2026', items: ['Fixed the legal footer sitting behind the browser address bar on mobile. The panel is now sized to the visible viewport rather than the full-screen height, so nothing is laid out underneath the browser toolbars — this matters most in Edge and Opera on Android, which place the address bar at the bottom of the screen.', 'The footer is now compact and stays on screen in landscape instead of being reachable only after scrolling to the end of a chapter.', 'The footer now also clears the home indicator and rounded display corners on modern phones.', 'The in-page overlay is sized the same way, so its lower edge is no longer covered by browser chrome.'] },
  { version: 'v0.4.190', date: 'August 19, 2026', items: ['Fixed PWA verse-click overlay being refused by content script when the background detected standalone mode but the content script\u2019s own detectStandalone() missed it (e.g., "Create shortcut" windows where display-mode is browser)', 'Fixed sidePanel.open() resolving silently in PWA windows with no visible panel — timeout now checks for a panel heartbeat and falls back to the in-page overlay via window-type detection', 'Increased fallback timeout to 1000ms to allow the side panel heartbeat to arrive for normal tabs before triggering a fallback'] },
  { version: 'v0.4.189', date: 'August 19, 2026', items: ['sidePanel.open() rejection now marks the tab as standalone so the timeout uses the overlay path instead of the popup-window path', 'Dynamic standalone check inside the timeout — was previously pre-computed before sidePanel.open() could reject, using a stale value', 'Toolbar click (onClicked) now tries sidePanel.open() and falls back to the in-page overlay on rejection for PWA windows'] },
  { version: 'v0.4.188', date: 'August 19, 2026', items: ['Removed all chrome.sidePanel.setOptions() calls that were wiping the manifest\u2019s default side panel path for normal tabs, causing every verse click to fall back to a popup window'] },
  { version: 'v0.4.187', date: 'August 18, 2026', items: ['Reverted openPanelOnActionClick to true — normal tabs now open the side panel instantly on toolbar click as before', 'Removed setOptions calls that were breaking the side panel path'] },
  { version: 'v0.4.185', date: 'August 18, 2026', items: ['Fixed PWA overlay being suppressed by stale side panel heartbeats from other tabs — background now skips the heartbeat check for standalone tabs and forwards the force flag to the overlay injector'] },
  { version: 'v0.4.184', date: 'August 18, 2026', items: ['Switched to dynamic small-viewport units (dvh) for mobile overlays to prevent content truncation by browser UI chrome', 'Hardened build pipeline to derive file lists from manifests, preventing stale packaging', 'Updated Edge API endpoints to v1.1 (api.addons.microsoftedge.microsoft.com)'] },
  { version: 'v0.4.183', date: 'August 19, 2026', items: ['Fixed the reading area becoming invisible and impossible to scroll on short viewports, such as mobile landscape and small popup windows. The panel now scrolls as a single document instead of a clipped full-height column, so the reading area can no longer collapse to nothing.', 'The legal footer is pinned to the bottom edge of the panel instead of sitting at the very end of the document.', 'Verified across interface zoom levels from 75% to 150% in both portrait and landscape orientations.'] },
  { version: 'v0.4.182', date: 'August 19, 2026', items: ['Fixed printing when the extension is opened from the browser menu on mobile. Print now opens a dedicated print page in a new tab: on Chromium-based mobile browsers (Edge for Android, Kiwi) the print dialog opens automatically, and on Firefox for Android \u2014 which cannot open a print dialog from a script \u2014 the page provides a \u201CPrint / Save as PDF\u201D button plus guidance to use the browser\u2019s own Print or Share option. This replaces the earlier fallback chain from v0.4.145, which reported success on mobile without ever printing.', 'Improved the print page to carry the scripture styling of the document being printed, with the on-screen toolbar automatically hidden on the printed page.'] },
  { version: 'v0.4.181', date: 'August 18, 2026', items: ['Fixed the long-standing brief flash of an in-page overlay when clicking a Bible reference on Chrome, Edge and Opera, caused by modern Chromium browsers also defining the \u201Cbrowser\u201D namespace historically unique to Firefox; browser detection is now based on the user agent and a Firefox-only API.'] },
  { version: 'v0.4.180', date: 'August 18, 2026', items: ['Fixed verse lookups on Firefox failing silently in several places due to Chrome-style callback APIs being used where Firefox expects promises.', 'Improved verse requests made while the extension\u2019s background service worker is starting up \u2014 now retried instead of reported as \u201Cnot found\u201D.'] },
  { version: 'v0.4.179', date: 'August 18, 2026', items: ['Fixed the brief flash of the default text size when opening the side panel by applying the saved interface scale before the panel\u2019s first paint rather than after loading from storage.', 'Fixed a small layout shift on open caused by the Verse of the Day banner.'] },
  { version: 'v0.4.178', date: 'August 18, 2026', items: ['Fixed the first verse click after opening the panel not reliably showing the requested verse by handing the verse to the panel through the page address.', 'Improved the header title to scale down to fit the available width, with a fallback for browsers that do not support container queries.'] },
  { version: 'v0.4.177', date: 'August 18, 2026', items: ['At high zoom levels, moved the header title onto its own row and reduced its size instead of dropping the logo and branding, with layout tiers derived from the panel\u2019s actual available width.'] },
  { version: 'v0.4.176', date: 'August 18, 2026', items: ['Fixed the first verse click after opening the panel occasionally showing the previous content, caused by two delivery paths racing each other.'] },
  { version: 'v0.4.175', date: 'August 18, 2026', items: ['Fixed the header clipping the title when the browser is zoomed in by having the panel measure its own effective width using container queries.', 'Fixed verse navigation failing on the first click when the panel was still initialising.'] },
  { version: 'v0.4.174', date: 'August 18, 2026', items: ['Removed the "scripting" permission entirely. It could never have worked without broad host access, so instead of requesting more permissions, an outdated content script now stands down on its own after an update and shows a small "reload this page" notice instead of acting.'] },
  { version: 'v0.4.173', date: 'August 18, 2026', items: ['Fixed interface zoom on browsers without CSS zoom support (Firefox before 126, including ESR builds): the panel now detects support at runtime and falls back to transform-based scaling with matching geometry, so no side gaps or clipped edges at any zoom level.'] },
  { version: 'v0.4.172', date: 'August 18, 2026', items: ['Clicking a verse now opens the real side panel instead of a popup window, by requesting it while the click is still active. A popup remains only as a fallback.'] },
  { version: 'v0.4.171', date: 'August 18, 2026', items: ['Added a DOM guard that instantly removes any leftover in-page overlay injected by an outdated copy of the extension in tabs that have not been reloaded.'] },
  { version: 'v0.4.170', date: 'August 18, 2026', items: ['The page now learns from the extension whether the browser has a real side panel, and refuses in-page overlays on browsers that do — except as a genuine last resort.'] },
  { version: 'v0.4.169', date: 'August 18, 2026', items: ['Fixed the context-menu lookup path bypassing the single-surface rule, and tightened the rule so two simultaneous requests can never open two windows.'] },
  { version: 'v0.4.168', date: 'August 18, 2026', items: ['Verse lookups now settle on one surface only: any overlay is withdrawn the moment a real panel or window takes the verse.'] },
  { version: 'v0.4.167', date: 'August 18, 2026', items: ['Improved detection of whether the side panel is already open, so lookups are routed to it rather than duplicating it.'] },
  { version: 'v0.4.166', date: 'August 18, 2026', items: ['Verse clicks on Chrome and Edge no longer create an in-page overlay: the verse goes to the side panel, with a lookup window as fallback. Content scripts are now version-stamped so an updated version reliably takes over.'] },
  { version: 'v0.4.159', date: 'August 18, 2026', items: ['Improved side panel presence detection and verse delivery reliability', 'Added storage-based heartbeat so content scripts can verify panel status without waking the service worker'] },
  { version: 'v0.4.147', date: 'August 17, 2026', items: ['Fixed UI clipping when zooming in (above 100%) by narrowing the root element width proportionally so content always fills 100% of the panel at any zoom level', 'Fixed blank space on the right when zooming out (below 100%) by widening the root element width to compensate for the scale reduction'] },
  { version: 'v0.4.146', date: 'August 17, 2026', items: ['Fixed zoom-out blank space by compensating root width proportional to scale (e.g., width set to 125% when zoom is 0.8)'] },
  { version: 'v0.4.145', date: 'August 17, 2026', items: ['Fixed print not working when the extension is opened from the browser menu on mobile by adding a three-tier fallback (new window \u2192 off-screen iframe \u2192 background tab creation)', 'Added a \u2018from=extension\u2019 URL parameter to Open Chapter links to prevent stale search results from flashing on the website'] },
  { version: 'v0.4.144', date: 'August 16, 2026', items: ['Fixed horizontal overflow and content clipping during zoom by applying zoom to the root <html> element instead of the inner #app container', 'Added flex-wrap to the Read navigation bar for narrow viewport widths'] },
  { version: 'v0.4.143', date: 'August 16, 2026', items: ['Added state persistence for book and chapter selection using chrome.storage.local for seamless transitions between popup and side panel', 'Added an iframe fallback for the print function on mobile devices'] },
  { version: 'v0.4.142', date: 'August 16, 2026', items: ['Internal version bump for store resubmission'] },
  { version: 'v0.4.141', date: 'August 16, 2026', items: ['Fixed copy buttons (Read chapter, Results cards, Gospel, Resources) that silently failed when the side panel lost focus — now uses a fallback clipboard method'] },
  { version: 'v0.4.140', date: 'August 16, 2026', items: ['Added a scroll-to-top button in the Read and Results tabs that appears when scrolling past 200px'] },
  { version: 'v0.4.139', date: 'August 16, 2026', items: ['Added WCAG 3:1 contrast safeguard: detected Bible references now fall back to a high-contrast color when the host page\u2019s inherited text color is too low contrast'] },
  { version: 'v0.4.138', date: 'August 16, 2026', items: ['Fixed a race condition where the in-page overlay would open even when the side panel was already visible'] },
  { version: 'v0.4.137', date: 'August 15, 2026', items: ['Replaced zoom-based scaling with fluid CSS reflow for correct tab and content wrapping at all viewport widths (300px\u2013900px) and zoom levels (75%\u2013150%)'] },
  { version: 'v0.4.136', date: 'August 15, 2026', items: ['Added \u201CCori\u201D as a recognized alias for \u201CCorinthians\u201D in Bible reference detection and sidebar lookup'] },
  { version: 'v0.4.135', date: 'August 15, 2026', items: ['Detected Bible references now inherit the host page\u2019s readable text color instead of forcing a fixed blue, while retaining a dotted underline and pointer cursor'] },
  { version: 'v0.4.134', date: 'August 15, 2026', items: ['Switched to painted text ranges for reference detection \u2014 no DOM modification, preventing stale references and preserving page layout'] },
  { version: 'v0.4.133', date: 'August 15, 2026', items: ['Improved detection of Bible references that span multiple HTML elements, including text across different font styles or character spacing'] },
  { version: 'v0.4.132', date: 'August 15, 2026', items: ['Added subtle styling to detected references: dotted underline, pointer cursor, and solid underline on hover'] },
  { version: 'v0.4.131', date: 'August 15, 2026', items: ['Preserved host page styling for detected references \u2014 the extension no longer overrides existing link colors or styles'] },
  { version: 'v0.4.130', date: 'August 15, 2026', items: ['Stale content is now hidden while loading new verses to prevent flashing of previous chapter text'] },
  { version: 'v0.4.129', date: 'August 15, 2026', items: ['Fixed Gospel reference navigation and cross-chapter range highlights; highlights now persist correctly across chapters and books'] },
  { version: 'v0.4.128', date: 'August 14, 2026', items: ['Migrated to a self-hosted KJB Reader API endpoint for improved reliability'] },
  { version: 'v0.4.127', date: 'August 14, 2026', items: ['Added Opera legacy action API callback compatibility', 'Edge mobile users can now open the extension from the browser menu without selecting a verse first'] },
  { version: 'v0.4.126', date: 'August 14, 2026', items: ['Added Firefox Android support via an adaptive Manifest V2 event-page model \u2014 desktop uses native sidebar, Android uses a full-screen overlay'] },
  { version: 'v0.4.125', date: 'August 14, 2026', items: ['Added resizable panel width (280\u2013800px) with a drag grip supporting mouse, touch, and keyboard', 'Added persistent A-/100%/A+ interface scaling controls for text, icons, and spacing'] },
  { version: 'v0.4.124', date: 'August 14, 2026', items: ['Fixed overlay close button overlapping header actions on narrow screens by adding a dedicated 40px top toolbar'] },
  { version: 'v0.4.123', date: 'August 14, 2026', items: ['Fixed the Copy button overlapping verse text in result cards at narrow sidebar widths'] },
  { version: 'v0.4.122', date: 'August 13, 2026', items: ['Audited and corrected all 66 Bible book titles against the live API \u2014 fixed 19 mismatched fallback titles'] },
  { version: 'v0.4.121', date: 'August 13, 2026', items: ['Fixed truncated book titles for 1\u20132 Samuel and 1\u20132 Kings; local fallback now uses full KJV canonical titles'] },
  { version: 'v0.4.120', date: 'August 13, 2026', items: ['Redesigned Results heading to a two-line layout: full book name on top, chapter number below, with an 8px gap'] },
  { version: 'v0.4.119', date: 'August 13, 2026', items: ['Unified book title formatting between Read and Results modes; standardized chapter heading font to 15px'] },
  { version: 'v0.4.118', date: 'August 13, 2026', items: ['Added full KJV book titles to chapter headings in search results with correct text wrapping'] },
  { version: 'v0.4.117', date: 'August 13, 2026', items: ['Created a dedicated Firefox-native background script to remove all Chrome-specific sidePanel API references'] },
  { version: 'v0.4.116', date: 'August 13, 2026', items: ['Added 6px spacing beneath the superscription divider for improved readability'] },
  { version: 'v0.4.115', date: 'August 13, 2026', items: ['Fixed four-digit verse number truncation in the parser', 'Highlight map now only includes verses confirmed by the API, preventing stale highlights'] },
  { version: 'v0.4.114', date: 'August 13, 2026', items: ['Nonexistent chapters (e.g., Psalm 200) now display a \u201Cnot found\u201D message instead of defaulting to Chapter 1', 'Updated parser to support four-digit verse numbers'] },
  { version: 'v0.4.113', date: 'August 13, 2026', items: ['Normalized 404 error handling across single, multi-book, and cross-chapter verse lookups'] },
  { version: 'v0.4.112', date: 'August 13, 2026', items: ['Restored missing pilcrows in colophons and increased spacing between the final verse and colophon block', 'Fixed rendering bug where invalid verses were hidden when chapter headers were present'] },
  { version: 'v0.4.111', date: 'August 13, 2026', items: ['Standardized all verse and structural body text to 15px; restored single pilcrows in colophons'] },
  { version: 'v0.4.110', date: 'August 13, 2026', items: ['Increased structural text width by reducing side padding; separated action buttons onto a dedicated row'] },
  { version: 'v0.4.109', date: 'August 13, 2026', items: ['Removed background boxes from structural text in favor of clean divider lines with 16px typography'] },
  { version: 'v0.4.108', date: 'August 13, 2026', items: ['Fixed off-center chapter headings caused by action button padding; headings now center against full card width'] },
  { version: 'v0.4.107', date: 'August 13, 2026', items: ['Centered chapter headings and increased font size for superscriptions, names, and colophons'] },
  { version: 'v0.4.106', date: 'August 13, 2026', items: ['Fixed hyperlink highlighting compatibility with split verse references'] },
  { version: 'v0.4.105', date: 'August 13, 2026', items: ['Improved hyperlink-safe scanning to preserve original href destinations on detected references'] },
  { version: 'v0.4.104', date: 'August 13, 2026', items: ['Unified plain-text scanning to detect Bible references across disparate HTML elements and font styles'] },
  { version: 'v0.4.103', date: 'August 13, 2026', items: ['Added unwrapping of existing partial-match links before performing new reference detections'] },
  { version: 'v0.4.102', date: 'August 13, 2026', items: ['Added PWA-detection fallback to trigger in-page overlay when the sidePanel API is unavailable'] },
  { version: 'v0.4.101', date: 'August 13, 2026', items: ['Added multi-book and cross-chapter reference lookup with persistent highlight map'] },
  { version: 'v0.4.100', date: 'August 13, 2026', items: ['Replaced static emoji glyphs with SVG icons for theme-aware interface colors'] },
  { version: 'v0.4.99', date: 'August 13, 2026', items: ['Streamlined interface to four tabs: Results, Read, Gospel, and Resources; removed history and favorites'] },
  { version: 'v0.4.98', date: 'August 13, 2026', items: ['Removed the Highlighting tool from the extension interface'] },
  { version: 'v0.4.97', date: 'August 13, 2026', items: ['Added Gospel tab with salvation resources and Resources tab with preacher links and ministry info'] },
  { version: 'v0.4.96', date: 'August 13, 2026', items: ['Added \u201CView in Sidebar\u201D button to the popup for transitioning to the full side panel'] },
  { version: 'v0.4.95', date: 'August 14, 2026', items: ['Implemented manifest-based side panel activation for manual browsing with popup windows for automated lookups'] },
  { version: 'v0.4.94', date: 'August 13, 2026', items: ['Added right-click context menu for verse lookups on selected text'] },
  { version: 'v0.4.93', date: 'August 13, 2026', items: ['Added advanced search with wildcard support (? and *), whole-word match, case-sensitive toggle, and Old/New Testament filtering'] },
  { version: 'v0.4.92', date: 'August 13, 2026', items: ['Added epistle subscriptions as centered, bold, bracket-italicized text and Psalm superscriptions with leading pilcrow'] },
  { version: 'v0.4.91', date: 'August 13, 2026', items: ['Excluded kingjamesbiblereader.com from content script execution to prevent self-detection loops'] },
  { version: 'v0.4.90', date: 'August 11, 2026', items: ['Removed local legal pages and centralized links to the KJB Reader website', 'Fixed a double-panel issue caused by a 2-second timeout fallback'] },
  { version: 'v0.4.89', date: 'August 11, 2026', items: ['Redirected privacy and terms links to website-hosted pages; removed obsolete local legal files'] },
  { version: 'v0.4.88', date: 'August 11, 2026', items: ['Fixed broken sidebar legal links by pointing them to external website URLs'] },
  { version: 'v0.4.87', date: 'August 10, 2026', items: ['Updated extension branding to \u201CKJB Reader - SidePanel\u201D with official site icons'] },
  { version: 'v0.4.86', date: 'August 9, 2026', items: ['Added local Privacy, Terms, and Contact pages synced with the website'] },
  { version: 'v0.4.85', date: 'August 9, 2026', items: ['Added copy function with approximate visual centering for headers and bracketed notation for italics'] },
  { version: 'v0.4.84', date: 'August 9, 2026', items: ['Added printed page footer: \u201CPrinted from KJB Reader Web Extension \u2014 kingjamesbiblereader.com/extension\u201D'] },
  { version: 'v0.4.83', date: 'August 9, 2026', items: ['Standardized \u201CThe\u201D prefixes for all 66 KJV books in dropdowns and displays'] },
  { version: 'v0.4.82', date: 'August 9, 2026', items: ['Added hand-drawn logo icon for extension branding'] },
  { version: 'v0.4.81', date: 'August 9, 2026', items: ['Applied black text for pilcrows at 16px for clear visibility'] },
  { version: 'v0.4.80', date: 'August 9, 2026', items: ['Rendered Hebrew section headings and superscriptions as centered, bold text positioned above verse text'] },
  { version: 'v0.4.79', date: 'August 9, 2026', items: ['Added colophons placed at the end of the card as normal-weight text'] },
  { version: 'v0.4.78', date: 'August 9, 2026', items: ['Applied italics to structural text only when content is enclosed in brackets'] },
  { version: 'v0.4.77', date: 'August 9, 2026', items: ['Set 16px font size for structural text with clean divider lines instead of bordered boxes'] },
  { version: 'v0.4.76', date: 'August 9, 2026', items: ['Added a unified bordered, rounded card for Psalm Hebrew section headings, superscriptions, and colophons'] },
  { version: 'v0.4.75', date: 'August 9, 2026', items: ['Included Psalm superscriptions and epistle colophons in search results with pilcrow and italicized bracket formatting'] },
  { version: 'v0.4.74', date: 'August 9, 2026', items: ['Added robust verse detection for varied formats including Roman numerals, ordinals, and references within link tags'] },
  { version: 'v0.4.73', date: 'August 9, 2026', items: ['Implemented unified plain-text scanning to detect Bible references across disparate HTML elements'] },
  { version: 'v0.4.72', date: 'August 9, 2026', items: ['Added side panel for verse lookup and search functionalities'] },
  { version: 'v0.4.71', date: 'August 9, 2026', items: ['Connected extension to the KJB Reader API for verse lookup, advanced search, and reference detection'] },
  { version: 'v0.4.70', date: 'August 9, 2026', items: ['Built initial sidebar layout with stacked header, search strip, and tab bar'] },
  { version: 'v0.4.69', date: 'August 9, 2026', items: ['Applied compact spacing, restrained surfaces, light borders, and minimal decoration for side panel UI'] },
  { version: 'v0.4.66', date: 'August 9, 2026', items: ['Implemented content script for auto-detection of Bible verse references on web pages'] },
  { version: 'v0.4.65', date: 'August 9, 2026', items: ['Initial Opera build with sidebar, verse lookup, search, and reference detection'] },
];

// Category styles: each maps to a label, chip classes, badge classes, and a
// left-border accent color. Categories are detected from the first verb of
// each changelog item.
const CATEGORIES = {
  new: {
    label: 'New',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300/60 dark:border-blue-500/30',
    badge: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600/40',
    accent: 'border-l-blue-500',
  },
  fix: {
    label: 'Fix',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/30',
    badge: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-emerald-600/40',
    accent: 'border-l-emerald-500',
  },
  improved: {
    label: 'Improved',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30',
    badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600/40',
    accent: 'border-l-amber-500',
  },
  ui: {
    label: 'UI',
    chip: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-300/60 dark:border-purple-500/30',
    badge: 'bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white border-purple-600/40',
    accent: 'border-l-purple-500',
  },
};

function classifyItem(item) {
  const t = item.toLowerCase();
  if (t.startsWith('fixed') || t.startsWith('fix ')) return 'fix';
  if (t.startsWith('added') || t.startsWith('created') || t.startsWith('built') || t.startsWith('implemented') || t.startsWith('connected') || t.startsWith('included')) return 'new';
  if (t.startsWith('improved') || t.startsWith('increased') || t.startsWith('restored') || t.startsWith('normalized') || t.startsWith('audited') || t.startsWith('updated') || t.startsWith('migrated') || t.startsWith('replaced') || t.startsWith('switched') || t.startsWith('streamlined') || t.startsWith('redirected') || t.startsWith('removed') || t.startsWith('excluded')) return 'improved';
  return 'ui';
}

function dominantCategory(items) {
  const counts = { new: 0, fix: 0, improved: 0, ui: 0 };
  items.forEach((it) => { counts[classifyItem(it)]++; });
  let best = 'ui', max = -1;
  for (const k of Object.keys(counts)) {
    if (counts[k] > max) { max = counts[k]; best = k; }
  }
  return best;
}

export default function ChangelogPage() {
  useEffect(() => {
    document.title = 'KJB Reader — Extension Changelog';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'KJB Reader browser extension version history and changelog.';
    if (meta) meta.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description'; m.content = desc;
      document.head.appendChild(m);
    }
    return () => { document.title = 'KJB Reader'; };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950 text-foreground">
      <div className="w-full max-w-[900px] mx-auto px-5 sm:px-8 lg:px-12 py-10 pb-24">
        <div className="mb-8">
          <Link
            to="/extension"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-transparent border border-border font-sans text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Extension
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 mb-5 shadow-lg shadow-purple-500/20">
            <History className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-4 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">
            KJB Reader — Extension Changelog
          </h1>
          <p className="font-sans text-sm font-semibold text-muted-foreground mb-4">
            Current Version: v0.4.229
          </p>
          <p className="font-sans text-base leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            A live, always-up-to-date record of every KJB Reader browser extension release. This page is linked from all store listings (Chrome, Edge, Firefox, Opera).
          </p>
        </div>

        {/* AI-generated disclaimer banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-[1.5px] shadow-lg shadow-purple-500/20">
          <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 px-5 py-4 sm:px-6 sm:py-4">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </span>
              <p className="font-sans text-sm sm:text-base font-medium text-white">
                These release notes are generated by AI after each build.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {CHANGELOG.map((entry) => {
            const cat = dominantCategory(entry.items);
            const style = CATEGORIES[cat];
            return (
              <div
                key={entry.version}
                className={`rounded-2xl border border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm shadow-sm p-6 border-l-4 ${style.accent}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full border font-sans text-xs font-semibold ${style.badge}`}>
                    {entry.version}
                  </span>
                  <span className="font-sans text-sm text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="space-y-2.5">
                  {entry.items.map((item, i) => {
                    const itemCat = classifyItem(item);
                    const itemStyle = CATEGORIES[itemCat];
                    return (
                      <li key={i} className="flex items-start gap-2.5 font-sans text-sm leading-relaxed text-foreground/90">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent mt-[0.55em]" />
                        <span className="flex-1 min-w-0">{item}</span>
                        <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-md font-sans text-[10px] font-semibold uppercase tracking-wide ${itemStyle.chip}`}>
                          {itemStyle.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}