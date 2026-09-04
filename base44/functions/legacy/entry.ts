// Legacy Bible Reader - 100% server-rendered HTML for IE8/IE9/Windows Phone
// No client-side JavaScript required - navigation uses plain forms and links

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ABBR_TO_NAME = {
  'Ge':'Genesis','Ex':'Exodus','Le':'Leviticus','Nu':'Numbers','De':'Deuteronomy',
  'Jos':'Joshua','Jg':'Judges','Ru':'Ruth','1Sa':'1 Samuel','2Sa':'2 Samuel',
  '1Ki':'1 Kings','2Ki':'2 Kings','1Ch':'1 Chronicles','2Ch':'2 Chronicles',
  'Ezr':'Ezra','Ne':'Nehemiah','Es':'Esther','Job':'Job','Ps':'Psalms','Pr':'Proverbs',
  'Ec':'Ecclesiastes','Song':'Song of Solomon','Isa':'Isaiah','Jer':'Jeremiah',
  'La':'Lamentations','Eze':'Ezekiel','Da':'Daniel','Ho':'Hosea','Joe':'Joel',
  'Am':'Amos','Ob':'Obadiah','Jon':'Jonah','Mic':'Micah','Na':'Nahum',
  'Hab':'Habakkuk','Zep':'Zephaniah','Hag':'Haggai','Zec':'Zechariah','Mal':'Malachi',
  'Mt':'Matthew','Mr':'Mark','Lu':'Luke','Joh':'John','Ac':'Acts','Ro':'Romans',
  '1Co':'1 Corinthians','2Co':'2 Corinthians','Ga':'Galatians','Eph':'Ephesians',
  'Php':'Philippians','Col':'Colossians','1Th':'1 Thessalonians','2Th':'2 Thessalonians',
  '1Ti':'1 Timothy','2Ti':'2 Timothy','Tit':'Titus','Phm':'Philemon','Heb':'Hebrews',
  'Jas':'James','1Pe':'1 Peter','2Pe':'2 Peter','1Jo':'1 John','2Jo':'2 John',
  '3Jo':'3 John','Jude':'Jude','Re':'Revelation'
};

const BOOK_ORDER = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon',
  'Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos',
  'Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah',
  'Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
  '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

const CHAPTER_COUNTS = {
  Genesis:50,Exodus:40,Leviticus:27,Numbers:36,Deuteronomy:34,Joshua:24,Judges:21,Ruth:4,
  '1 Samuel':31,'2 Samuel':24,'1 Kings':22,'2 Kings':25,'1 Chronicles':29,'2 Chronicles':36,
  Ezra:10,Nehemiah:13,Esther:10,Job:42,Psalms:150,Proverbs:31,Ecclesiastes:12,'Song of Solomon':8,
  Isaiah:66,Jeremiah:52,Lamentations:5,Ezekiel:48,Daniel:12,Hosea:14,Joel:3,Amos:9,Obadiah:1,
  Jonah:4,Micah:7,Nahum:3,Habakkuk:3,Zephaniah:3,Haggai:2,Zechariah:14,Malachi:4,
  Matthew:28,Mark:16,Luke:24,John:21,Acts:28,Romans:16,'1 Corinthians':16,'2 Corinthians':13,
  Galatians:6,Ephesians:6,Philippians:4,Colossians:4,'1 Thessalonians':5,'2 Thessalonians':3,
  '1 Timothy':6,'2 Timothy':4,Titus:3,Philemon:1,Hebrews:13,James:5,'1 Peter':5,'2 Peter':3,
  '1 John':5,'2 John':1,'3 John':1,Jude:1,Revelation:22
};

const FULL_BOOK_NAMES = {
  'Genesis':'The First Book of Moses, called Genesis',
  'Exodus':'The Second Book of Moses, called Exodus',
  'Leviticus':'The Third Book of Moses, called Leviticus',
  'Numbers':'The Fourth Book of Moses, called Numbers',
  'Deuteronomy':'The Fifth Book of Moses, called Deuteronomy',
  'Joshua':'The Book of Joshua','Judges':'The Book of Judges','Ruth':'The Book of Ruth',
  '1 Samuel':'The First Book of Samuel','2 Samuel':'The Second Book of Samuel',
  '1 Kings':'The First Book of the Kings','2 Kings':'The Second Book of the Kings',
  '1 Chronicles':'The First Book of the Chronicles','2 Chronicles':'The Second Book of the Chronicles',
  'Ezra':'The Book of Ezra','Nehemiah':'The Book of Nehemiah','Esther':'The Book of Esther',
  'Job':'The Book of Job','Psalms':'The Book of Psalms','Proverbs':'The Proverbs',
  'Ecclesiastes':'Ecclesiastes','Song of Solomon':'The Song of Solomon',
  'Isaiah':'The Book of Isaiah','Jeremiah':'The Book of Jeremiah',
  'Lamentations':'The Lamentations of Jeremiah','Ezekiel':'The Book of Ezekiel',
  'Daniel':'The Book of Daniel','Hosea':'Hosea','Joel':'Joel','Amos':'Amos',
  'Obadiah':'Obadiah','Jonah':'Jonah','Micah':'Micah','Nahum':'Nahum',
  'Habakkuk':'Habakkuk','Zephaniah':'Zephaniah','Haggai':'Haggai',
  'Zechariah':'Zechariah','Malachi':'Malachi',
  'Matthew':'The Gospel According to Matthew','Mark':'The Gospel According to Mark',
  'Luke':'The Gospel According to Luke','John':'The Gospel According to John',
  'Acts':'The Acts of the Apostles','Romans':'The Epistle to the Romans',
  '1 Corinthians':'The First Epistle to the Corinthians','2 Corinthians':'The Second Epistle to the Corinthians',
  'Galatians':'The Epistle to the Galatians','Ephesians':'The Epistle to the Ephesians',
  'Philippians':'The Epistle to the Philippians','Colossians':'The Epistle to the Colossians',
  '1 Thessalonians':'The First Epistle to the Thessalonians','2 Thessalonians':'The Second Epistle to the Thessalonians',
  '1 Timothy':'The First Epistle to Timothy','2 Timothy':'The Second Epistle to Timothy',
  'Titus':'The Epistle to Titus','Philemon':'The Epistle to Philemon',
  'Hebrews':'The Epistle to the Hebrews','James':'The Epistle of James',
  '1 Peter':'The First General Epistle of Peter','2 Peter':'The Second General Epistle of Peter',
  '1 John':'The First General Epistle of John','2 John':'The Second General Epistle of John',
  '3 John':'The Third General Epistle of John','Jude':'The General Epistle of Jude',
  'Revelation':'The Revelation of Saint John the Divine'
};

const SUBSCRIPTS = {
  'Psalms:3':'A Psalm of David, when he fled from Absalom his son.',
  'Psalms:4':'To the chief Musician on Neginoth, A Psalm of David.',
  'Psalms:5':'To the chief Musician upon Nehiloth, A Psalm of David.',
  'Psalms:6':'To the chief Musician on Neginoth upon Sheminith, A Psalm of David.',
  'Psalms:7':'Shiggaion of David, which he sang unto the LORD, concerning the words of Cush the Benjamite.',
  'Psalms:8':'To the chief Musician upon Gittith, A Psalm of David.',
  'Psalms:9':'To the chief Musician upon Muth-labben, A Psalm of David.',
  'Psalms:11':'To the chief Musician, [A] [Psalm] of David.',
  'Psalms:12':'To the chief Musician upon Sheminith, A Psalm of David.',
  'Psalms:13':'To the chief Musician, A Psalm of David.',
  'Psalms:14':'To the chief Musician, [A] [Psalm] of David.',
  'Psalms:15':'A Psalm of David.',
  'Psalms:16':'Michtam of David.',
  'Psalms:17':'A Prayer of David.',
  'Psalms:18':'To the chief Musician, [A] [Psalm] of David, the servant of the LORD, who spake unto the LORD the words of this song in the day [that] the LORD delivered him from the hand of all his enemies, and from the hand of Saul: And he said,',
  'Psalms:19':'To the chief Musician, A Psalm of David.',
  'Psalms:20':'To the chief Musician, A Psalm of David.',
  'Psalms:21':'To the chief Musician, A Psalm of David.',
  'Psalms:22':'To the chief Musician upon Aijeleth Shahar, A Psalm of David.',
  'Psalms:23':'A Psalm of David.',
  'Psalms:24':'A Psalm of David.',
  'Psalms:25':'[A] [Psalm] of David.',
  'Psalms:26':'[A] [Psalm] of David.',
  'Psalms:27':'[A] [Psalm] of David.',
  'Psalms:28':'[A] [Psalm] of David.',
  'Psalms:29':'A Psalm of David.',
  'Psalms:30':'A Psalm [and] Song [at] the dedication of the house of David.',
  'Psalms:31':'To the chief Musician, A Psalm of David.',
  'Psalms:32':'[A] [Psalm] of David, Maschil.',
  'Psalms:34':'[A] [Psalm] of David, when he changed his behaviour before Abimelech; who drove him away, and he departed.',
  'Psalms:35':'[A] [Psalm] of David.',
  'Psalms:36':'To the chief Musician, [A] [Psalm] of David the servant of the LORD.',
  'Psalms:37':'[A] [Psalm] of David.',
  'Psalms:38':'A Psalm of David, to bring to remembrance.',
  'Psalms:39':'To the chief Musician, [even] to Jeduthun, A Psalm of David.',
  'Psalms:40':'To the chief Musician, A Psalm of David.',
  'Psalms:41':'To the chief Musician, A Psalm of David.',
  'Psalms:42':'To the chief Musician, Maschil, for the sons of Korah.',
  'Psalms:44':'To the chief Musician for the sons of Korah, Maschil.',
  'Psalms:45':'To the chief Musician upon Shoshannim, for the sons of Korah, Maschil, A Song of loves.',
  'Psalms:46':'To the chief Musician for the sons of Korah, A Song upon Alamoth.',
  'Psalms:47':'To the chief Musician, A Psalm for the sons of Korah.',
  'Psalms:48':'A Song [and] Psalm for the sons of Korah.',
  'Psalms:49':'To the chief Musician, A Psalm for the sons of Korah.',
  'Psalms:50':'A Psalm of Asaph.',
  'Psalms:51':'To the chief Musician, A Psalm of David, when Nathan the prophet came unto him, after he had gone in to Bath-sheba.',
  'Psalms:52':'To the chief Musician, Maschil, [A] [Psalm] of David, when Doeg the Edomite came and told Saul, and said unto him, David is come to the house of Ahimelech.',
  'Psalms:53':'To the chief Musician upon Mahalath, Maschil, [A] [Psalm] of David.',
  'Psalms:54':'To the chief Musician on Neginoth, Maschil, [A] [Psalm] of David, when the Ziphims came and said to Saul, Doth not David hide himself with us?',
  'Psalms:55':'To the chief Musician on Neginoth, Maschil, [A] [Psalm] of David.',
  'Psalms:56':'To the chief Musician upon Jonath-elem-rechokim, Michtam of David, when the Philistines took him in Gath.',
  'Psalms:57':'To the chief Musician, Al-taschith, Michtam of David, when he fled from Saul in the cave.',
  'Psalms:58':'To the chief Musician, Al-taschith, Michtam of David.',
  'Psalms:59':'To the chief Musician, Al-taschith, Michtam of David; when Saul sent, and they watched the house to kill him.',
  'Psalms:60':'To the chief Musician upon Shushan-eduth, Michtam of David, to teach; when he strove with Aram-naharaim and with Aram-zobah, when Joab returned, and smote of Edom in the valley of salt twelve thousand.',
  'Psalms:61':'To the chief Musician upon Neginah, [A] [Psalm] of David.',
  'Psalms:62':'To the chief Musician, to Jeduthun, A Psalm of David.',
  'Psalms:63':'A Psalm of David, when he was in the wilderness of Judah.',
  'Psalms:64':'To the chief Musician, A Psalm of David.',
  'Psalms:65':'To the chief Musician, A Psalm [and] Song of David.',
  'Psalms:66':'To the chief Musician, A Song [or] Psalm.',
  'Psalms:67':'To the chief Musician on Neginoth, A Psalm [or] Song.',
  'Psalms:68':'To the chief Musician, A Psalm [or] Song of David.',
  'Psalms:69':'To the chief Musician upon Shoshannim, [A] [Psalm] of David.',
  'Psalms:70':'To the chief Musician, [A] [Psalm] of David, to bring to remembrance.',
  'Psalms:72':'[A] [Psalm] for Solomon.',
  'Psalms:73':'A Psalm of Asaph.',
  'Psalms:74':'Maschil of Asaph.',
  'Psalms:75':'To the chief Musician, Al-taschith, A Psalm [or] Song of Asaph.',
  'Psalms:76':'To the chief Musician on Neginoth, A Psalm [or] Song of Asaph.',
  'Psalms:77':'To the chief Musician, to Jeduthun, A Psalm of Asaph.',
  'Psalms:78':'Maschil of Asaph.',
  'Psalms:79':'A Psalm of Asaph.',
  'Psalms:80':'To the chief Musician upon Shoshannim-Eduth, A Psalm of Asaph.',
  'Psalms:81':'To the chief Musician upon Gittith, [A] [Psalm] of Asaph.',
  'Psalms:82':'A Psalm of Asaph.',
  'Psalms:83':'A Song [or] Psalm of Asaph.',
  'Psalms:84':'To the chief Musician upon Gittith, A Psalm for the sons of Korah.',
  'Psalms:85':'To the chief Musician, A Psalm for the sons of Korah.',
  'Psalms:86':'A Prayer of David.',
  'Psalms:87':'A Psalm [or] Song for the sons of Korah.',
  'Psalms:88':'A Song [or] Psalm for the sons of Korah, to the chief Musician upon Mahalath Leannoth, Maschil of Heman the Ezrahite.',
  'Psalms:89':'Maschil of Ethan the Ezrahite.',
  'Psalms:90':'A Prayer of Moses the man of God.',
  'Psalms:92':'A Psalm [or] Song for the sabbath day.',
  'Psalms:98':'A Psalm.',
  'Psalms:100':'A Psalm of praise.',
  'Psalms:101':'A Psalm of David.',
  'Psalms:102':'A Prayer of the afflicted, when he is overwhelmed, and poureth out his complaint before the LORD.',
  'Psalms:103':'[A] [Psalm] of David.',
  'Psalms:108':'A Song [or] Psalm of David.',
  'Psalms:109':'To the chief Musician, A Psalm of David.',
  'Psalms:110':'A Psalm of David.',
  'Psalms:120':'A Song of degrees.',
  'Psalms:121':'A Song of degrees.',
  'Psalms:122':'A Song of degrees of David.',
  'Psalms:123':'A Song of degrees.',
  'Psalms:124':'A Song of degrees of David.',
  'Psalms:125':'A Song of degrees.',
  'Psalms:126':'A Song of degrees.',
  'Psalms:127':'A Song of degrees for Solomon.',
  'Psalms:128':'A Song of degrees.',
  'Psalms:129':'A Song of degrees.',
  'Psalms:130':'A Song of degrees.',
  'Psalms:131':'A Song of degrees of David.',
  'Psalms:132':'A Song of degrees.',
  'Psalms:133':'A Song of degrees of David.',
  'Psalms:134':'A Song of degrees.',
  'Psalms:138':'[A] [Psalm] of David.',
  'Psalms:139':'To the chief Musician, A Psalm of David.',
  'Psalms:140':'To the chief Musician, A Psalm of David.',
  'Psalms:141':'A Psalm of David.',
  'Psalms:142':'Maschil of David; A Prayer when he was in the cave.',
  'Psalms:143':'A Psalm of David.',
  'Psalms:144':'[A] [Psalm] of David.',
  'Psalms:145':"David's [Psalm] of praise."
};

const COLOPHONS = {
  'Romans:16':'Written to the Romans from Corinthus, [and sent] by Phebe servant of the church at Cenchrea.',
  '1 Corinthians:16':'The first [epistle] to the Corinthians was written from Philippi by Stephanas, and Fortunatus, and Achaicus, and Timotheus.',
  '2 Corinthians:13':'The second [epistle] to the Corinthians was written from Philippi, [a city] of Macedonia, by Titus and Lucas.',
  'Galatians:6':'Unto the Galatians written from Rome.',
  'Ephesians:6':'Written from Rome unto the Ephesians by Tychicus.',
  'Philippians:4':'It was written to the Philippians from Rome by Epaphroditus.',
  'Colossians:4':'Written from Rome to the Colossians by Tychicus and Onesimus.',
  '1 Thessalonians:5':'The first [epistle] unto the Thessalonians was written from Athens.',
  '2 Thessalonians:3':'The second [epistle] to the Thessalonians was written from Athens.',
  '1 Timothy:6':'The first to Timothy was written from Laodicea, which is the chiefest city of Phrygia Pacatiana.',
  '2 Timothy:4':'The second [epistle] unto Timotheus, ordained the first bishop of the church of the Ephesians, was written from Rome, when Paul was brought before Nero the second time.',
  'Titus:3':'It was written to Titus, ordained the first bishop of the church of the Cretians, from Nicopolis of Macedonia.',
  'Philemon:1':'Written from Rome to Philemon, by Onesimus a servant.',
  'Hebrews:13':'Written to the Hebrews from Italy by Timothy.'
};

let bibleData = null;
// In-memory cache for pre-generated format exports (pdf, rtf, txt, doc).
// First request generates; all subsequent requests serve the cached bytes
// instantly — no re-generation needed.
const formatCache = {};

async function loadBible() {
  if (bibleData) return bibleData;
  const TEXT_URL = 'https://media.base44.com/files/public/6a05d76723afe58d80c589e8/91ec9491e_WHARTON_PCE.txt';
  const res = await fetch(TEXT_URL, { timeout: 10000 });
  if (!res.ok) throw new Error('Failed to fetch Bible text: ' + res.status);
  const text = await res.text();
  const data = {};
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) continue;
    const abbr = trimmed.slice(0, spaceIdx);
    const rest = trimmed.slice(spaceIdx + 1);
    const colonIdx = rest.indexOf(':');
    if (colonIdx === -1) continue;
    const chapter = parseInt(rest.slice(0, colonIdx), 10);
    if (isNaN(chapter)) continue;
    const spaceIdx2 = rest.indexOf(' ', colonIdx);
    if (spaceIdx2 === -1) continue;
    const verse = parseInt(rest.slice(colonIdx + 1, spaceIdx2), 10);
    let verseText = rest.slice(spaceIdx2 + 1);
    if (isNaN(verse) || !verseText) continue;
    const bookName = ABBR_TO_NAME[abbr];
    if (!bookName) continue;
    verseText = verseText.replace(/\s*¶\s*\[.*?\]\s*$/, '').trim();
    verseText = verseText.replace(/\s*made\s+in\s+australia\.?\s*$/i, '').trim();
    verseText = verseText.replace(/\s*[\u00B6\uFFFD]\s*THE END\.?\s*$/i, '').trim();
    if (!verseText) continue;
    if (!data[bookName]) data[bookName] = {};
    if (!data[bookName][chapter]) data[bookName][chapter] = [];
    data[bookName][chapter].push({ verse, text: verseText });
  }
  bibleData = data;
  return data;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function renderVerse(raw) {
  let t = raw.replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/\u201C/g, '"').replace(/\u201D/g, '"').replace(/(\w)\uFFFD(\w)/g, "$1'$2");
  t = esc(t);
  let leadingPilcrow = false;
  if (/^[\u00B6\uFFFD]\s*/.test(t)) { leadingPilcrow = true; t = t.replace(/^[\u00B6\uFFFD]\s*/, ''); }
  t = t.replace(/([\s.,;:!?'")\]])[\u00B6\uFFFD]\s*/g, '$1<span class="pil">&para; </span>');
  t = t.replace(/[\u00B6\uFFFD]/g, '');
  t = t.replace(/\[([^\]]+)\]/g, '<em>$1</em>');
  return { html: t, leadingPilcrow };
}

function renderMeta(text) {
  let t = esc(text);
  t = t.replace(/\[([^\]]+)\]/g, '<em>$1</em>');
  return t;
}

function bookOptions(selected) {
  let h = '<optgroup label="Old Testament">';
  const otEnd = BOOK_ORDER.indexOf('Malachi');
  for (let i = 0; i <= otEnd; i++) {
    const b = BOOK_ORDER[i];
    h += '<option value="' + esc(b) + '"' + (b === selected ? ' selected' : '') + '>' + esc(b) + '</option>';
  }
  h += '</optgroup><optgroup label="New Testament">';
  for (let i = otEnd + 1; i < BOOK_ORDER.length; i++) {
    const b = BOOK_ORDER[i];
    h += '<option value="' + esc(b) + '"' + (b === selected ? ' selected' : '') + '>' + esc(b) + '</option>';
  }
  h += '</optgroup>';
  return h;
}

function chapterOptions(book, selected) {
  const n = CHAPTER_COUNTS[book] || 1;
  let h = '';
  for (let i = 1; i <= n; i++) {
    h += '<option value="' + i + '"' + (i === selected ? ' selected' : '') + '>' + i + '</option>';
  }
  return h;
}

async function fetchDailyVerse(base44) {
  try {
    const d = new Date();
    const clientDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    console.log('[Legacy] Fetching daily verse for:', clientDate);
    const res = await base44.asServiceRole.functions.invoke('bibleApi', { action: 'daily_verse', clientDate: clientDate });
    const data = res && res.data ? res.data : res;
    console.log('[Legacy] Daily verse data:', JSON.stringify(data));
    if (!data || !data.verse || !data.verse.text || !data.verse.ref) {
      console.log('[Legacy] Daily verse data missing required fields');
      return null;
    }
    return data.verse;
  } catch (e) {
    console.log('[Legacy] Daily verse fetch error:', e.message);
    return null;
  }
}

const STATIC_LEGACY_URL = 'https://media.base44.com/files/public/6a05d76723afe58d80c589e8/kjb-reader-legacy.html';
const STATIC_LEGACY_DOMAINS = ['kjbreaderlegacy.com', 'kingjamesbiblereader.com'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);

    // Legacy domains fall through to the server-rendered page (static file removed).

    // The legacy reader is now a single page: the Full Bible (which also
    // embeds Gospel, Resources and About). All other tabs are removed.
    let book = url.searchParams.get('book') || 'Genesis';
    if (BOOK_ORDER.indexOf(book) === -1) book = 'Genesis';
    let chapter = parseInt(url.searchParams.get('chapter') || '1', 10);
    if (isNaN(chapter) || chapter < 1 || chapter > (CHAPTER_COUNTS[book] || 1)) chapter = 1;
    
    const appIdParam = url.searchParams.get('app_id');
    // Point all links/forms/AJAX at the ACTUAL function endpoint — never the
    // React SPA root ("/") or the SPA's /legacy redirect page, which would
    // bounce the user back through the "Opening Legacy Reader…" screen.
    // Resolve the app_id from the query param or the env var and build the
    // absolute function path, which works on both the custom domain and base44.
    const appId = appIdParam || Deno.env.get('BASE44_APP_ID') || '';

    // ── Renders one book's full HTML (used by both chunk mode and full page) ──
    function buildBookHtml(bible, bi) {
      const bName = BOOK_ORDER[bi];
      const bData = bible[bName];
      if (!bData) return '';
      const fullName = FULL_BOOK_NAMES[bName] || bName;
      const maxCh = CHAPTER_COUNTS[bName] || 1;
      let out = '<div class="fb-book"><a name="b' + bi + '" id="b' + bi + '"></a>' +
        '<h2 class="fb-bookname notranslate" translate="no">' + esc(fullName) + '</h2>' +
        '<p class="fb-top"><a href="#top">&uarr; Back to top</a></p>';
      if (maxCh > 1) {
        let chapLinks = '<p class="fb-chaplinks"><span class="fb-chaplinks-label">Chapters:</span> ';
        for (let ch = 1; ch <= maxCh; ch++) {
          chapLinks += '<a href="#b' + bi + 'c' + ch + '">' + ch + '</a> ';
        }
        chapLinks += '</p>';
        out += chapLinks;
      }
      for (let ch = 1; ch <= maxCh; ch++) {
        const verses = bData[ch] || [];
        out += '<h3 class="fb-chap"><a name="b' + bi + 'c' + ch + '" id="b' + bi + 'c' + ch + '"></a><span class="notranslate" translate="no">Chapter ' + ch + '</span> <a href="#b' + bi + '" class="fb-chaptop">&uarr; book top</a></h3>';
        const sub = SUBSCRIPTS[bName + ':' + ch];
        if (sub) out += '<div class="subscript notranslate" translate="no"><span class="pil">&para; </span>' + renderMeta(sub) + '</div>';
        for (let vi = 0; vi < verses.length; vi++) {
          const r = renderVerse(verses[vi].text);
          const pil = r.leadingPilcrow ? '<span class="pil">&para; </span>' : '';
          out += '<div class="verse notranslate" translate="no"><span class="vn">' + verses[vi].verse + '</span>' + pil + r.html + '</div>';
        }
        const col = COLOPHONS[bName + ':' + ch];
        if (col) out += '<div class="colophon notranslate" translate="no"><span class="pil">&para; </span>' + renderMeta(col) + '</div>';
      }
      out += '</div>';
      return out;
    }

    // ── CHUNK MODE: ?chunk=N returns just book N's HTML (small, cacheable) ──
    // The shell page below fetches these one-by-one so each download is small
    // and reliable even on a weak connection.
    // ── DOWNLOAD MODE: ?download=1 streams the self-contained single-file
    // Bible THROUGH this function (same Cloudflare TLS-1.0 origin) so IE9/IE11
    // users — who cannot reach base44.app's TLS-1.2-only host — can still get it. ──
    // DOWNLOAD MODE flag — actual build happens later, after the
    // Gospel/Resources/About HTML consts are defined (see below).
    const isDownload = url.searchParams.get('download') === '1';

    const chunkParam = url.searchParams.get('chunk');
    if (chunkParam !== null) {
      const bi = parseInt(chunkParam, 10);
      if (isNaN(bi) || bi < 0 || bi >= BOOK_ORDER.length) {
        return new Response('Bad chunk', { status: 400 });
      }
      const bible = await loadBible();
      const chunkHtml = buildBookHtml(bible, bi);
      return new Response(chunkHtml, { headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'",
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Expires': 'Fri, 31 Dec 9999 23:59:59 GMT',
        'Access-Control-Allow-Origin': '*'
      } });
    }
    // On a custom domain the function is reachable at the clean /functions/legacy
    // path (no app_id needed). Only base44.app hosting needs the app-scoped path.
    const reqHost = url.hostname || '';
    const isCustomHost = reqHost.indexOf('base44.app') === -1 && reqHost.indexOf('localhost') === -1;
    const basePath = (!isCustomHost && appId)
      ? '/api/apps/' + encodeURIComponent(appId) + '/functions/legacy'
      : '/functions/legacy';

    // ── FORMAT EXPORT: ?format=txt|rtf|doc|pdf ──
    // Whole-Bible downloads matching the non-legacy export: two columns,
    // subscripts, colophons, [bracketed] italics, pilcrows, full book names.
    // Generated once on first request, then cached in memory — subsequent
    // downloads serve the stored bytes instantly with no re-generation.
    const fmt = url.searchParams.get('format');
    if (fmt === 'txt' || fmt === 'rtf' || fmt === 'doc' || fmt === 'pdf') {
      const CACHE_HDR = { 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' };

      // Serve from in-memory cache if already generated
      if (formatCache[fmt]) {
        const c = formatCache[fmt];
        return new Response(c.body, { headers: { ...c.headers, ...CACHE_HDR } });
      }

      const bible = await loadBible();

      // ── Shared text helpers ──
      function normalize(raw) {
        let t = String(raw)
          .replace(/^<<[^>]*>>\s*/, '')
          .replace(/\u2019/g, "'").replace(/\u2018/g, "'")
          .replace(/\u201C/g, '"').replace(/\u201D/g, '"')
          .replace(/\s*made\s+in\s+australia\.?\s*/gi, ' ')
          .replace(/\s{2,}/g, ' ').trim();
        return t;
      }
      function stripEndMarker(text) {
        return String(text)
          .replace(/\s*[\u00B6\uFFFD]?\s*THE END\.?\s*$/i, '')
          .replace(/\s*[\u00B6\uFFFD]?\s*END OF THE PROPHETS\.?\s*$/i, '')
          .trim();
      }
      function hasPilcrow(text) {
        return String(text).indexOf('\u00B6') !== -1 || String(text).indexOf('\uFFFD') !== -1;
      }
      // Plain text for TXT: keep [brackets] for italics, pilcrows as ¶ prefix
      function plainTxt(raw, keepBrackets) {
        let s = normalize(raw);
        s = s.replace(/(\w)[\u00B6\uFFFD](\w)/g, "$1'$2");
        s = s.replace(/[\u00B6\uFFFD]\s*/g, '\u00B6 ');
        if (!keepBrackets) s = s.replace(/\[([^\]]+)\]/g, '$1');
        return s.trim();
      }
      // Split into {text, italic} segments for PDF italic rendering
      function toSegments(raw) {
        let s = normalize(raw);
        s = s.replace(/(\w)[\u00B6\uFFFD](\w)/g, "$1'$2");
        s = s.replace(/[\u00B6\uFFFD]\s*/g, '\u00B6 ');
        const parts = s.split(/\[([^\]]+)\]/g);
        const segs = [];
        parts.forEach((part, i) => { if (part) segs.push({ text: part, italic: i % 2 === 1 }); });
        return segs;
      }
      const isOld = (bName) => BOOK_ORDER.indexOf(bName) < 39;

      // Strip bracket markers, pilcrows and cleanup artefacts for plain formats
      function cleanVT(raw) {
        let t = raw.replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/\u201C/g, '"').replace(/\u201D/g, '"');
        t = t.replace(/\s*\u00B6\s*\[.*?\]\s*$/, '').trim();
        t = t.replace(/\s*made\s+in\s+australia\.?\s*$/i, '').trim();
        t = t.replace(/\s*[\u00B6\uFFFD]\s*THE END\.?\s*$/i, '').trim();
        t = t.replace(/[\u00B6\uFFFD]/g, '');
        t = t.replace(/\[([^\]]+)\]/g, '$1');
        return t;
      }

      if (fmt === 'txt') {
        // TXT: single column, full book names, [brackets] kept for italics,
        // Psalm superscriptions + epistle colophons included, pilcrows preserved.
        let out = 'THE KING JAMES BIBLE\r\nPure Cambridge Edition\r\n\r\n\r\n';
        out += 'CONTENTS\r\n\r\n';
        let lastT = null, idx = 1;
        BOOK_ORDER.forEach(bName => {
          const t = isOld(bName) ? 'old' : 'new';
          if (t !== lastT) { lastT = t; out += '\r\n' + (t === 'old' ? 'THE OLD TESTAMENT' : 'THE NEW TESTAMENT') + '\r\n\r\n'; }
          out += '  ' + idx + '. ' + (FULL_BOOK_NAMES[bName] || bName) + '\r\n\r\n';
          idx++;
        });
        out += '\r\n\r\n';
        for (let bi = 0; bi < BOOK_ORDER.length; bi++) {
          const bName = BOOK_ORDER[bi];
          const bData = bible[bName];
          if (!bData) continue;
          out += '\r\n\r\n\r\n' + (FULL_BOOK_NAMES[bName] || bName) + '\r\n\r\n';
          const maxCh = CHAPTER_COUNTS[bName] || 1;
          for (let ch = 1; ch <= maxCh; ch++) {
            let verses = bData[ch] || [];
            if (!verses.length) continue;
            const isOtEnd = bName === 'Malachi' && ch === maxCh;
            const isNtEnd = bName === 'Revelation' && ch === maxCh;
            if (isOtEnd || isNtEnd) {
              const last = verses[verses.length - 1];
              verses = verses.slice(0, -1).concat([{ ...last, text: stripEndMarker(last.text) }]);
            }
            out += 'Chapter ' + ch + '\r\n\r\n';
            const sub = SUBSCRIPTS[bName + ':' + ch];
            if (sub) out += '\u00B6 ' + plainTxt(sub, true) + '\r\n\r\n';
            for (let vi = 0; vi < verses.length; vi++) {
              const v = verses[vi];
              if (v.heading) { out += '\r\n' + v.heading + '\r\n\r\n'; }
              else if (vi > 0 && hasPilcrow(v.text)) out += '\r\n';
              out += v.verse + ' ' + plainTxt(v.text, true) + '\r\n';
            }
            const colo = COLOPHONS[bName + ':' + ch];
            if (colo) out += '\r\n\u00B6 ' + plainTxt(colo, true) + '\r\n\r\n';
            out += '\r\n';
          }
          if (bName === 'Malachi') out += '\r\n\r\n' + (bi === BOOK_ORDER.length - 1 ? 'THE END.' : 'THE END OF THE PROPHETS.') + '\r\n\r\n';
          if (bName === 'Revelation') out += '\r\n\r\nTHE END.\r\n\r\n';
        }
        const headers = { 'Content-Type': 'text/plain;charset=UTF-8', 'Content-Disposition': 'attachment; filename="kjb-bible-1col-full-names-subscripts-colophons.txt"' };
        formatCache[fmt] = { body: out, headers };
        return new Response(out, { headers: { ...headers, ...CACHE_HDR } });
      }

      if (fmt === 'rtf') {
        // RTF: two columns, [brackets]→\i italics, Psalm superscriptions +
        // epistle colophons, running headers, pilcrows.
        function rtfEsc(s) {
          let o = '';
          for (const ch of String(s)) {
            const code = ch.codePointAt(0);
            if (ch === '\\' || ch === '{' || ch === '}') o += '\\' + ch;
            else if (code === 0xB6) o += '\\u182?';
            else if (code > 127) o += '\\u' + (code > 32767 ? code - 65536 : code) + '?';
            else o += ch;
          }
          return o;
        }
        function rtfInline(text) {
          let s = normalize(text);
          s = s.replace(/(\w)[\u00B6\uFFFD](\w)/g, "$1'$2");
          s = s.replace(/[\u00B6\uFFFD]\s*/g, '\u00B6 ');
          s = s.replace(/\]\s*\[/g, ' ');
          const parts = s.split(/\[([^\]]+)\]/g);
          return parts.map((p, i) => (i % 2 === 1 ? '{\\i ' + rtfEsc(p) + '}' : rtfEsc(p))).join('');
        }
        const lines = [];
        const para = (rtf, opts) => {
          opts = opts || {};
          const center = opts.center ? '\\qc' : '\\ql';
          const bold = opts.bold ? '\\b' : '';
          const size = opts.size || 22;
          const sb = opts.sb || 0;
          const sa = opts.sa === undefined ? 80 : opts.sa;
          const keepNext = opts.keepNext ? '\\keepn' : '';
          const style = opts.style ? '\\s' + opts.style : '';
          lines.push('{\\pard' + center + keepNext + style + '\\sb' + sb + '\\sa' + sa + '\\fs' + size + bold + ' ' + rtf + (bold ? '\\b0' : '') + '\\par}');
        };
        lines.push('\\sectdFRONT ');
        lines.push('{\\pard\\sa1800\\par}');
        para(rtfEsc('THE KING JAMES BIBLE'), { center: true, bold: true, size: 48, sa: 200 });
        para(rtfEsc('Pure Cambridge Edition'), { center: true, size: 24, sa: 200 });
        lines.push('\\page ');
        para(rtfEsc('CONTENTS'), { center: true, bold: true, size: 34, sa: 240 });
        let lastT = null, idx = 1;
        BOOK_ORDER.forEach(bName => {
          const t = isOld(bName) ? 'old' : 'new';
          if (t !== lastT) { lastT = t; para(rtfEsc(t === 'old' ? 'THE OLD TESTAMENT' : 'THE NEW TESTAMENT'), { bold: true, size: 26, sb: 160, sa: 80 }); }
          lines.push('{\\pard\\fi-240\\li360\\sa40\\fs20 ' + idx + '.\\tab ' + rtfEsc(FULL_BOOK_NAMES[bName] || bName) + '\\par}');
          idx++;
        });
        for (let bi = 0; bi < BOOK_ORDER.length; bi++) {
          const bName = BOOK_ORDER[bi];
          const bData = bible[bName];
          if (!bData) continue;
          lines.push('\\sect ');
          lines.push('\\sectd\\headery720 \\titlepg{\\headerf \\pard\\par}{\\header \\pard\\qc\\fs18\\i ' + rtfEsc(FULL_BOOK_NAMES[bName] || bName) + '\\i0\\par}');
          // Heading 1 for testament (shows in Word's navigation panel as collapsible group)
          if (isOld(bName) && bi === 0) para(rtfEsc('THE OLD TESTAMENT'), { center: true, bold: true, size: 28, sb: 120, sa: 80, style: 1 });
          if (!isOld(bName) && (bi === 0 || isOld(BOOK_ORDER[bi - 1]))) para(rtfEsc('THE NEW TESTAMENT'), { center: true, bold: true, size: 28, sb: 120, sa: 80, style: 1 });
          // Heading 2 for book (nested under testament in the nav panel)
          para(rtfEsc(FULL_BOOK_NAMES[bName] || bName), { center: true, bold: true, size: 32, sb: 120, sa: 160, style: 2 });
          const maxCh = CHAPTER_COUNTS[bName] || 1;
          for (let ch = 1; ch <= maxCh; ch++) {
            let verses = bData[ch] || [];
            if (!verses.length) continue;
            const isOtEnd = bName === 'Malachi' && ch === maxCh;
            const isNtEnd = bName === 'Revelation' && ch === maxCh;
            if (isOtEnd || isNtEnd) {
              const last = verses[verses.length - 1];
              verses = verses.slice(0, -1).concat([{ ...last, text: stripEndMarker(last.text) }]);
            }
            para('Chapter ' + ch, { center: true, bold: true, size: 22, sb: 240, sa: 120 });
            const sub = SUBSCRIPTS[bName + ':' + ch];
            if (sub) para('\\u182? ' + rtfInline(sub).replace(/^\\u182\?\s*/, ''), { center: true, size: 18, sa: 120 });
            for (let vi = 0; vi < verses.length; vi++) {
              const v = verses[vi];
              if (v.heading) { para(rtfEsc(v.heading), { center: true, bold: true, size: 20, sb: 80, sa: 80 }); continue; }
              const isPil = vi > 0 && hasPilcrow(v.text);
              para('{\\b ' + v.verse + '} ' + rtfInline(v.text), { sb: isPil ? 120 : 0, keepNext: isPil });
            }
            const colo = COLOPHONS[bName + ':' + ch];
            if (colo) para('\\u182? ' + rtfInline(colo).replace(/^\\u182\?\s*/, ''), { center: true, size: 18, sa: 120 });
          }
          if (bName === 'Malachi') para(bi === BOOK_ORDER.length - 1 ? 'THE END.' : 'THE END OF THE PROPHETS.', { center: true, bold: true, size: 24 });
          if (bName === 'Revelation') para('THE END.', { center: true, bold: true, size: 26 });
          lines.push('\\sect \\sectd\\sbknone\\BALANCECOLS ');
        }
        const colsHeader = '\\cols2\\colsx360';
        const body = lines.join('\n')
          .replace(/\\sectdFRONT/g, '\u0000FRONT\u0000')
          .replace(/\\BALANCECOLS/g, colsHeader)
          .replace(/\\sectd/g, '\\sectd' + colsHeader)
          .replace(/\u0000FRONT\u0000/g, '\\sectd');
        const rtf = '{\\rtf1\\ansi\\deff0\\fet0{\\fonttbl{\\f0 Georgia;}}{\\stylesheet{\\s1\\ql\\b\\fs28\\sb240\\sa120 The Old Testament;}{\\s2\\ql\\b\\fs24\\sb200\\sa100 Heading 2;}}\\f0\\fs20 ' + body + '}';
        const headers = { 'Content-Type': 'application/rtf;charset=UTF-8', 'Content-Disposition': 'attachment; filename="kjb-bible-2col-full-names-subscripts-colophons.rtf"' };
        formatCache[fmt] = { body: rtf, headers };
        return new Response(rtf, { headers: { ...headers, ...CACHE_HDR } });
      }

      if (fmt === 'doc') {
        // DOC (Word HTML): two columns via CSS, <i> for [bracketed] italics,
        // Psalm superscriptions + epistle colophons, running headers, pilcrows.
        function escH(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        function docxInline(text) {
          let s = normalize(text);
          s = s.replace(/(\w)[\u00B6\uFFFD](\w)/g, "$1'$2");
          s = s.replace(/[\u00B6\uFFFD]\s*/g, '\u00B6 ');
          const parts = s.split(/\[([^\]]+)\]/g);
          return parts.map((p, i) => i % 2 === 1 ? '<i>' + escH(p) + '</i>' : escH(p)).join('');
        }
        let sectionCount = 0;
        const out = [];
        const headerDivs = [];
        out.push('<div class="SectionFront">');
        out.push('<p style="text-align:center;font-size:26pt;font-weight:bold;margin:6px 0">THE KING JAMES BIBLE</p>');
        out.push('<p style="text-align:center;font-size:13pt;margin:4px 0">Pure Cambridge Edition</p>');
        out.push('<br style="page-break-after:always" />');
        out.push('<p style="text-align:center;font-size:20pt;font-weight:bold;margin:6px 0">CONTENTS</p>');
        let lastT = null, idx = 1;
        BOOK_ORDER.forEach(bName => {
          const t = isOld(bName) ? 'old' : 'new';
          if (t !== lastT) { lastT = t; out.push('<p style="margin:8px 0 2px"><b>' + (t === 'old' ? 'THE OLD TESTAMENT' : 'THE NEW TESTAMENT') + '</b></p>'); }
          out.push('<p style="margin:1px 0 1px 28px;text-indent:-20px">' + idx + '.&nbsp;&nbsp;' + escH(FULL_BOOK_NAMES[bName] || bName) + '</p>');
          idx++;
        });
        out.push('<br style="page-break-after:always" />');
        for (let bi = 0; bi < BOOK_ORDER.length; bi++) {
          const bName = BOOK_ORDER[bi];
          const bData = bible[bName];
          if (!bData) continue;
          sectionCount++;
          const sid = 'Section' + sectionCount;
          const hid = 'h' + sectionCount;
          headerDivs.push('<div style="mso-element:header" id="' + hid + '"><p class=MsoHeader style="text-align:center"><i>' + escH(FULL_BOOK_NAMES[bName] || bName) + '</i></p></div>');
          // Heading 1 for testament (collapsible group in Word's navigation panel)
          let testamentH1 = '';
          if (isOld(bName) && bi === 0) testamentH1 = '<h1 style="text-align:center">THE OLD TESTAMENT</h1>';
          if (!isOld(bName) && (bi === 0 || isOld(BOOK_ORDER[bi - 1]))) testamentH1 = '<h1 style="text-align:center">THE NEW TESTAMENT</h1>';
          out.push('</div><div class="' + sid + '" style="page-break-before:always">' + testamentH1 + '<h2 style="text-align:center">' + escH(FULL_BOOK_NAMES[bName] || bName) + '</h2>');
          const maxCh = CHAPTER_COUNTS[bName] || 1;
          for (let ch = 1; ch <= maxCh; ch++) {
            let verses = bData[ch] || [];
            if (!verses.length) continue;
            const isOtEnd = bName === 'Malachi' && ch === maxCh;
            const isNtEnd = bName === 'Revelation' && ch === maxCh;
            if (isOtEnd || isNtEnd) {
              const last = verses[verses.length - 1];
              verses = verses.slice(0, -1).concat([{ ...last, text: stripEndMarker(last.text) }]);
            }
            out.push('<p style="text-align:center;margin-top:18px"><b>Chapter ' + ch + '</b></p>');
            const sub = SUBSCRIPTS[bName + ':' + ch];
            if (sub) out.push('<p style="text-align:center;font-size:10pt;color:#555;font-style:italic">\u00B6 ' + docxInline(sub) + '</p>');
            for (let vi = 0; vi < verses.length; vi++) {
              const v = verses[vi];
              if (v.heading) { out.push('<p style="text-align:center;margin-top:14px"><b>' + escH(v.heading) + '</b></p>'); continue; }
              if (vi > 0 && hasPilcrow(v.text)) out.push('<p style="margin:0;line-height:6pt">&nbsp;</p>');
              out.push('<p style="page-break-inside:avoid;page-break-after:avoid"><b>' + v.verse + '</b> ' + docxInline(v.text) + '</p>');
            }
            const colo = COLOPHONS[bName + ':' + ch];
            if (colo) out.push('<p style="text-align:center;font-size:10pt;color:#555;font-style:italic">\u00B6 ' + docxInline(colo) + '</p>');
          }
          if (bName === 'Malachi') {
            out.push('<p style="text-align:center;margin-top:14px"><b>' + (bi === BOOK_ORDER.length - 1 ? 'THE END.' : 'THE END OF THE PROPHETS.') + '</b></p>');
            out.push('<br style="page-break-after:always" />');
          }
          if (bName === 'Revelation') out.push('<p style="text-align:center;margin-top:14px"><b>THE END.</b></p>');
        }
        out.push('</div>');
        const colDecl = 'columns:2;column-gap:24px;';
        let pageRules = '@page SectionFront { mso-header-margin:0.5in; } div.SectionFront { }';
        for (let i = 1; i <= sectionCount; i++) {
          pageRules += '@page Section' + i + ' { mso-title-page:yes; mso-header: url("#h' + i + '") h' + i + '; mso-header-margin:0.5in; ' + colDecl + ' } div.Section' + i + ' { -webkit-column-count:2;column-count:2;column-gap:24px; }';
        }
        const bodyHtml = out.join('\n') + '\n' + headerDivs.join('\n');
        const html = '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>KJB</title><style>' + pageRules + ' p.MsoHeader{margin:0;}</style></head><body style="font-family:Georgia,serif;font-size:11pt;">' + bodyHtml + '</body></html>';
        const headers = { 'Content-Type': 'application/msword;charset=UTF-8', 'Content-Disposition': 'attachment; filename="kjb-bible-2col-full-names-subscripts-colophons.doc"' };
        formatCache[fmt] = { body: html, headers };
        return new Response(html, { headers: { ...headers, ...CACHE_HDR } });
      }

      // PDF: two columns, italic font for [brackets], Psalm superscriptions +
      // epistle colophons, running headers, title page, pilcrows.
      if (fmt === 'pdf') {
        const { jsPDF } = await import('npm:jspdf@4.2.1');
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 40, gutter = 18;
        const twoColW = (pageW - margin * 2 - gutter) / 2;
        const bodySize = 9;
        const headerGap = 16;
        let col = 0, y = margin;
        let runningHead = '';
        function stampHeader() {
          if (!runningHead) return;
          pdf.setFont('times', 'italic'); pdf.setFontSize(9);
          pdf.text(runningHead, pageW / 2, margin - 6, { align: 'center', baseline: 'top' });
        }
        function newPage() { pdf.addPage(); col = 0; y = runningHead ? margin + headerGap : margin; stampHeader(); }
        function ensureSpace(needed) {
          needed = needed || bodySize + 4;
          if (y + needed <= pageH - margin) return;
          if (col === 0) { col = 1; y = runningHead ? margin + headerGap : margin; } else newPage();
        }
        const atPageTop = () => col === 0 && y === (runningHead ? margin + headerGap : margin);
        const cWidth = () => twoColW;
        const cX = () => margin + (col === 1 ? twoColW + gutter : 0);

        function writeCenteredMixed(rawText, size) {
          size = size || 8;
          pdf.setFontSize(size);
          const segs = toSegments(rawText);
          const spaceW = () => { pdf.setFont('times', 'normal'); return pdf.getTextWidth(' '); };
          const words = [];
          segs.forEach(s => { s.text.split(/(\s+)/).filter(w => w.length).forEach(w => { if (!/^\s+$/.test(w)) words.push({ w, italic: s.italic }); }); });
          const linesArr = [];
          let line = [], lineW = 0;
          words.forEach(word => {
            pdf.setFont('times', word.italic ? 'italic' : 'normal');
            const ww = pdf.getTextWidth(word.w);
            const add = (line.length ? spaceW() : 0) + ww;
            if (line.length && lineW + add > cWidth()) { linesArr.push({ words: line, width: lineW }); line = []; lineW = 0; }
            line.push(word); lineW += (line.length > 1 ? spaceW() : 0) + ww;
          });
          if (line.length) linesArr.push({ words: line, width: lineW });
          linesArr.forEach(ln => {
            ensureSpace(size + 4);
            let x = cX() + (cWidth() - ln.width) / 2;
            ln.words.forEach((word, i) => {
              if (i > 0) { pdf.setFont('times', 'normal'); x += spaceW(); }
              pdf.setFont('times', word.italic ? 'italic' : 'normal');
              pdf.text(word.w, x, y, { baseline: 'top' }); x += pdf.getTextWidth(word.w);
            });
            y += size + 3.5;
          });
          y += 4;
        }

        // Title page
        runningHead = '';
        y = pageH / 4;
        pdf.setFont('times', 'bold'); pdf.setFontSize(28);
        pdf.text('THE KING JAMES BIBLE', pageW / 2, y, { align: 'center' }); y += 30;
        pdf.setFont('times', 'normal'); pdf.setFontSize(14);
        pdf.text('Pure Cambridge Edition', pageW / 2, y, { align: 'center' }); y += 24;
        pdf.setFontSize(10);
        const tpLines = pdf.splitTextToSize('Containing the Old and New Testaments — Translated out of the Original Tongues and with the Former Translations Diligently Compared and Revised', pageW - margin * 2);
        tpLines.forEach(ln => { pdf.text(ln, pageW / 2, y, { align: 'center' }); y += 14; });
        pdf.addPage();
        y = margin;

        const bookPages = []; // { book, page, testament } — for PDF outline bookmarks
        for (let bi = 0; bi < BOOK_ORDER.length; bi++) {
          const bName = BOOK_ORDER[bi];
          const bData = bible[bName];
          if (!bData) continue;
          const fullName = FULL_BOOK_NAMES[bName] || bName;
          runningHead = '';
          if (!atPageTop()) newPage();
          bookPages.push({ book: bName, page: pdf.internal.getNumberOfPages(), testament: isOld(bName) ? 'old' : 'new' });
          pdf.setFont('times', 'bold'); pdf.setFontSize(15);
          const tLines = pdf.splitTextToSize(fullName, cWidth());
          tLines.forEach(ln => { pdf.text(ln, cX() + cWidth() / 2, y, { align: 'center' }); y += 18; });
          y += 8;
          runningHead = fullName;
          const maxCh = CHAPTER_COUNTS[bName] || 1;
          for (let ch = 1; ch <= maxCh; ch++) {
            let verses = bData[ch] || [];
            if (!verses.length) continue;
            const isOtEnd = bName === 'Malachi' && ch === maxCh;
            const isNtEnd = bName === 'Revelation' && ch === maxCh;
            if (isOtEnd || isNtEnd) {
              const last = verses[verses.length - 1];
              verses = verses.slice(0, -1).concat([{ ...last, text: stripEndMarker(last.text) }]);
            }
            ensureSpace(34 + bodySize + 8);
            if (ch > 1 && !atPageTop()) y += 12;
            pdf.setFont('times', 'bold'); pdf.setFontSize(11);
            pdf.text('Chapter ' + ch, cX() + cWidth() / 2, y, { align: 'center' });
            y += 22;
            const sub = SUBSCRIPTS[bName + ':' + ch];
            if (sub) writeCenteredMixed(sub, 8);
            for (let vi = 0; vi < verses.length; vi++) {
              const v = verses[vi];
              if (v.heading) {
                y += 8;
                pdf.setFont('times', 'bold'); pdf.setFontSize(10);
                const hLines = pdf.splitTextToSize(v.heading, cWidth());
                hLines.forEach(ln => { ensureSpace(14); pdf.text(ln, cX() + cWidth() / 2, y, { align: 'center' }); y += 14; });
                y += 6; pdf.setFontSize(bodySize);
              } else if (vi > 0 && hasPilcrow(v.text)) {
                y += 6; ensureSpace((bodySize + 3.5) * 2 + 6);
              }
              // Write verse with italic segments
              const segs = toSegments(v.text);
              pdf.setFontSize(bodySize);
              let x = cX(), startX = cX();
              let lineHasContent = false;
              const spaceW = () => { pdf.setFont('times', 'normal'); return pdf.getTextWidth(' '); };
              const wrap = () => { y += bodySize + 3.5; ensureSpace(bodySize + 4); x = cX(); startX = cX(); lineHasContent = false; };
              pdf.setFont('times', 'bold');
              pdf.text(String(v.verse), x, y, { baseline: 'top' });
              x += pdf.getTextWidth(String(v.verse) + ' ');
              pdf.setFont('times', 'normal'); lineHasContent = true;
              segs.forEach(seg => {
                pdf.setFont('times', seg.italic ? 'italic' : 'normal');
                const words = seg.text.split(/(\s+)/).filter(w => w.length);
                words.forEach(w => {
                  if (/^\s+$/.test(w)) { if (lineHasContent) x += spaceW(); return; }
                  const ww = pdf.getTextWidth(w);
                  if (x + ww > startX + cWidth() && lineHasContent) wrap();
                  pdf.setFont('times', seg.italic ? 'italic' : 'normal');
                  pdf.text(w, x, y, { baseline: 'top' }); x += ww; lineHasContent = true;
                });
              });
              y += bodySize + 3.5;
            }
            const colo = COLOPHONS[bName + ':' + ch];
            if (colo) { y += 3; writeCenteredMixed('\u00B6 ' + normalize(colo).replace(/^\u00B6\s*/, ''), 8); pdf.setFontSize(bodySize); }
          }
          if (bName === 'Malachi') {
            y += 10;
            pdf.setFont('times', 'bold'); pdf.setFontSize(11);
            const endT = bi === BOOK_ORDER.length - 1 ? 'THE END.' : 'THE END OF THE PROPHETS.';
            const ew = pdf.getTextWidth(endT);
            pdf.text(endT, cX() + (cWidth() - ew) / 2, y); y += 16;
          }
          if (bName === 'Revelation') {
            y += 10;
            pdf.setFont('times', 'bold'); pdf.setFontSize(12);
            const ew = pdf.getTextWidth('THE END.');
            pdf.text('THE END.', cX() + (cWidth() - ew) / 2, y); y += 16;
          }
        }
        // ── Collapsible PDF outline bookmarks: Testament ▸ Book ──
        // Appears as an expandable tree in the PDF reader's bookmarks/contents sidebar.
        if (pdf.outline && pdf.outline.add) {
          const otFirst = bookPages.find(b => b.testament === 'old');
          const ntFirst = bookPages.find(b => b.testament === 'new');
          let otNode = null, ntNode = null;
          if (otFirst) otNode = pdf.outline.add(null, 'THE OLD TESTAMENT', { pageNumber: otFirst.page });
          if (ntFirst) ntNode = pdf.outline.add(null, 'THE NEW TESTAMENT', { pageNumber: ntFirst.page });
          bookPages.forEach(({ book, page, testament }) => {
            const parent = testament === 'old' ? otNode : ntNode;
            pdf.outline.add(parent, book, { pageNumber: page });
          });
          const lastPage = bookPages.length ? bookPages[bookPages.length - 1].page : pdf.internal.getNumberOfPages();
          pdf.outline.add(null, 'The End', { pageNumber: lastPage });
        }

        const pdfBytes = pdf.output('arraybuffer');
        const headers = { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="kjb-bible-2col-full-names-subscripts-colophons.pdf"' };
        formatCache[fmt] = { body: pdfBytes, headers };
        return new Response(pdfBytes, { headers: { ...headers, ...CACHE_HDR } });
      }
    }
    const theme = url.searchParams.get('theme') === 'dark' ? 'dark' : 'light';
    const isDark = theme === 'dark';
    // Set by LegacyReader.jsx's iframe URL on native only -- the wrapper
    // shown above this embedded page already has its own "Back to App"
    // button with proper in-app back-history, so this link would just be a
    // second, duplicate way to do the same thing there. Web (no such
    // wrapper) and the native "Open in Browser" link (genuinely external at
    // that point) both keep this link, since it's the only way back either
    // of them has.
    const hideBackLink = url.searchParams.get('native') === '1';
    // Carry the app_id forward on every navigation so the absolute function
    // path keeps resolving correctly.
    const idSuffix = (appId ? '&app_id=' + encodeURIComponent(appId) : '') + (isDark ? '&theme=dark' : '');

    const STYLE = '*{margin:0;padding:0;box-sizing:border-box;}body{background:#f5f5f7;color:#1a1a1a;font-family:Georgia,serif;font-size:16px;line-height:1.6;}.hdr{background:#2d2a6e;color:#fff;padding:16px;text-align:center;}.hdr h1{font-size:22px;}.hdr p{font-size:12px;color:#cfcfe8;}.tabs{width:100%;background:#3d3a80;font-size:0;}.tabs a{display:inline-block;width:20%;padding:12px 2px;text-align:center;color:#cfcfe8;text-decoration:none;font-size:12px;font-family:Arial,sans-serif;}.tabs a.on{background:#5b59a0;color:#fff;font-weight:bold;}.wrap{max-width:760px;margin:0 auto;padding:16px;}.box{background:#fff;padding:16px;margin-bottom:16px;border:1px solid #e0e0ec;}.ctl{margin-bottom:12px;}.ctl label{display:block;font-size:14px;font-weight:bold;color:#333;margin-bottom:5px;font-family:Arial,sans-serif;}.ctl select{width:100%;padding:9px;font-size:16px;border:1px solid #ccc;font-family:Arial,sans-serif;}.read-btn{background:#2d2a6e;color:#fff;padding:11px;border:none;cursor:pointer;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;width:100%;}.chead{text-align:center;margin:20px 0 16px;}.cbook{font-size:22px;font-weight:bold;color:#2d2a6e;display:block;}.cnum{font-size:13px;color:#666;display:block;margin-top:4px;}.verse{display:block;margin:20px 0 10px 0;line-height:1.5;}.vn{font-weight:bold;color:#2d2a6e;font-size:11px;margin-right:4px;}.subscript{text-align:center;color:#555;font-size:14px;margin:0 0 16px;}.colophon{text-align:center;color:#555;font-size:14px;margin:18px 0 0;padding-top:12px;border-top:1px solid #e0e0ec;}.pil{color:#888;display:inline;white-space:nowrap;}em{font-style:italic;}.nav{text-align:center;margin:20px 0;}.nav a{display:inline-block;padding:10px 18px;margin:0 4px;background:#2d2a6e;color:#fff;text-decoration:none;font-size:14px;font-family:Arial,sans-serif;}.box h3{color:#2d2a6e;margin-bottom:10px;font-size:16px;}.box blockquote{background:#f7f7fb;padding:12px;margin:8px 0;border-left:3px solid #2d2a6e;font-style:italic;}.box a{color:#2d2a6e;}.sec-title{font-size:20px;color:#2d2a6e;font-weight:bold;margin:24px 0 10px;text-align:center;}.sec-sub{font-size:14px;color:#666;text-align:center;margin-bottom:16px;}.step{background:#fff;border:1px solid #e0e0ec;border-left:4px solid #2d2a6e;padding:14px 16px;margin-bottom:14px;}.step h4{color:#2d2a6e;font-size:15px;margin-bottom:8px;font-family:Arial,sans-serif;}.step .ref{display:block;margin-top:8px;font-size:13px;color:#444;font-family:Arial,sans-serif;}.warn{background:#fdf0f0;border:1px solid #e9c4c4;padding:14px 16px;margin-bottom:14px;}.warn h4{color:#b02525;font-size:15px;margin-bottom:8px;font-family:Arial,sans-serif;}.warn ul{margin:6px 0 0 18px;}.warn li{font-size:14px;margin-bottom:3px;}.lnk{display:block;padding:10px 12px;margin-bottom:8px;background:#f7f7fb;border:1px solid #e0e0ec;text-decoration:none;color:#2d2a6e;font-size:14px;font-family:Arial,sans-serif;}.lnk b{display:block;color:#1a1a1a;margin-bottom:2px;}.lnk span{display:block;color:#666;font-size:12px;}.res-cat{font-size:16px;color:#2d2a6e;font-weight:bold;margin:18px 0 8px;font-family:Arial,sans-serif;border-bottom:2px solid #e0e0ec;padding-bottom:5px;}.about-list{margin:8px 0 0 18px;}.about-list li{font-size:14px;margin-bottom:8px;line-height:1.5;}.doc{max-width:760px;margin:0 auto;}.doc h1{font-size:26px;color:#2d2a6e;margin:12px 0 24px;text-align:center;}.doc h2{font-size:19px;color:#2d2a6e;margin:44px 0 18px;padding-bottom:8px;border-bottom:1px solid #e0e0ec;}.doc h3{font-size:16px;color:#444;margin:30px 0 14px;}.doc p{margin:0 0 22px;line-height:1.85;}.doc p.lead{color:#555;font-size:17px;margin-bottom:36px;}.doc p.note{color:#777;font-size:13px;margin:32px 0;}.doc ul{margin:0 0 28px 28px;list-style-type:disc;}.doc li{margin-bottom:16px;line-height:1.75;padding-left:6px;}.doc blockquote{margin:0 0 22px;padding-left:18px;border-left:3px solid #c9c7e0;color:#444;font-style:italic;line-height:1.85;}.doc a{color:#2d2a6e;}.doc p.rlnk{margin:0 0 16px;}.doc p.rlnk span{color:#666;font-style:normal;}.banner{background:#fdf0f0;border-bottom:2px solid #e9c4c4;color:#7a1f1f;padding:12px 16px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;text-align:center;}.banner>b{display:block;font-size:14px;margin-bottom:4px;}.banner li b{display:inline;}.banner ul{margin:6px auto 0;padding:0;list-style-position:inside;display:inline-block;text-align:left;}.banner li{margin-bottom:3px;}.banner a{color:#7a1f1f;font-weight:bold;}.fb-intro{font-size:15px;color:#555;margin-bottom:16px;line-height:1.6;}.fb-index{background:#fff;border:1px solid #e0e0ec;padding:14px 16px;margin-bottom:24px;}.fb-index-title{font-size:13px;font-weight:bold;color:#333;font-family:Arial,sans-serif;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;}.fb-testament{font-size:15px;font-weight:bold;color:#2d2a6e;margin:12px 0 6px;}.fb-books{line-height:2.2;}.fb-books a{display:inline-block;padding:3px 9px;margin:2px;background:#f7f7fb;border:1px solid #e0e0ec;color:#2d2a6e;text-decoration:none;font-size:13px;font-family:Arial,sans-serif;}.fb-book{margin-bottom:32px;border-top:2px solid #e0e0ec;padding-top:8px;}.fb-bookname{font-size:21px;color:#2d2a6e;text-align:center;margin:16px 0 4px;}.fb-top{text-align:center;margin-bottom:12px;}.fb-top a{font-size:12px;color:#888;text-decoration:none;font-family:Arial,sans-serif;}.fb-chap{font-size:15px;color:#666;font-weight:bold;margin:20px 0 8px;font-family:Arial,sans-serif;border-bottom:1px solid #eee;padding-bottom:4px;}.fb-chaplinks{margin:0 0 16px;line-height:2.2;}.fb-chaplinks-label{font-size:13px;font-weight:bold;color:#333;font-family:Arial,sans-serif;margin-right:6px;}.fb-chaplinks a{display:inline-block;min-width:24px;text-align:center;padding:3px 7px;margin:2px;background:#f7f7fb;border:1px solid #e0e0ec;color:#2d2a6e;text-decoration:none;font-size:13px;font-family:Arial,sans-serif;}.fb-chaptop{font-size:11px;font-weight:normal;color:#888;text-decoration:none;font-family:Arial,sans-serif;margin-left:8px;}.dl-box{background:#eef0fb;border:1px solid #c9c7e0;padding:16px;margin-bottom:24px;}.dl-box b{display:block;font-size:15px;color:#2d2a6e;margin-bottom:8px;}.dl-box p{font-size:14px;color:#444;margin:0 0 10px;line-height:1.6;}.dl-box .dl-how{font-size:13px;color:#555;margin-bottom:0;}.dl-btn{display:inline-block;background:#2d2a6e;color:#fff;text-decoration:none;padding:11px 18px;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;}.dl-formats{margin:10px 0;}.dl-formats a{display:inline-block;padding:7px 14px;margin:3px 4px 3px 0;background:#f7f7fb;border:1px solid #c9c7e0;color:#2d2a6e;text-decoration:none;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;}.hdr .back{display:inline-block;margin-bottom:8px;color:#cfcfe8;font-size:13px;text-decoration:none;font-family:Arial,sans-serif;}';
    const DARK_STYLE = 'body{background:#1a1a1e;color:#e5e5e5;}.hdr .back{color:#a5a5d0;}.hdr{background:#1e1b4d;}.tabs{background:#2d2a6e;}.tabs a{color:#a5a5d0;}.tabs a.on{background:#3d3a80;color:#fff;}.box{background:#252830;border-color:#3a3d4a;color:#e5e5e5;}.ctl label{color:#e5e5e5;}.ctl select{background:#1a1a1e;border-color:#4a4d5a;color:#e5e5e5;}.read-btn{background:#3d3a80;}.cbook{color:#7c7ceb;}.vn{color:#7c7ceb;}.subscript,.colophon{color:#aaa;}.pil{color:#666;}.nav a{background:#3d3a80;}.box blockquote{background:#1e1b4d;border-left-color:#7c7ceb;}.box a{color:#7c7ceb;}.sec-title{color:#7c7ceb;}.sec-sub{color:#aaa;}.step{background:#252830;border-color:#3a3d4a;border-left-color:#7c7ceb;}.step h4{color:#7c7ceb;}.step .ref{color:#aaa;}.warn{background:#2a1a1a;border-color:#4a2a2a;}.warn h4{color:#f56565;}.lnk{background:#1e1b4d;border-color:#3a3d4a;color:#7c7ceb;}.lnk b{color:#e5e5e5;}.lnk span{color:#aaa;}.res-cat{color:#7c7ceb;border-bottom-color:#3a3d4a;}.about-list li{color:#e5e5e5;}.banner{background:#2a1a1a;border-bottom-color:#4a2a2a;color:#f0b8b8;}.banner a{color:#f0b8b8;}.fb-intro{color:#aaa;}.fb-index{background:#252830;border-color:#3a3d4a;}.fb-index-title{color:#e5e5e5;}.fb-testament{color:#7c7ceb;}.fb-books a{background:#1e1b4d;border-color:#3a3d4a;color:#7c7ceb;}.fb-book{border-top-color:#3a3d4a;}.fb-bookname{color:#7c7ceb;}.fb-chap{color:#aaa;border-bottom-color:#3a3d4a;}.fb-chaplinks-label{color:#e5e5e5;}.fb-chaplinks a{background:#1e1b4d;border-color:#3a3d4a;color:#7c7ceb;}.fb-chaptop{color:#888;}.dl-box{background:#1e1b4d;border-color:#3a3d4a;}.dl-box b{color:#7c7ceb;}.dl-box p{color:#ccc;}.dl-box .dl-how{color:#aaa;}.dl-btn{background:#3d3a80;color:#fff;}.dl-formats a{background:#1e1b4d;border-color:#3a3d4a;color:#7c7ceb;}';

    let bodyInner = '';

    const lnk = (url, title, desc) => '<p class="rlnk"><a href="' + url + '" target="_blank">' + title + '</a>' + (desc ? '<span> &mdash; ' + desc + '</span>' : '') + '</p>';
    const gospelHtml = '<div class="doc">' +
        '<h1>How to be Saved</h1>' +
        '<p class="lead">The Gospel is the glad tidings of the Lord Jesus Christ: trust he is God, died, shed his blood, was buried and rose again on the 3rd day for our sins.</p>' +
        '<h2>1. Believe you are a sinner that deserves hell</h2>' +
        '<blockquote>"Therefore by the deeds of the law there shall no flesh be justified in his sight: for by the law is the knowledge of sin." &mdash; Romans 3:20</blockquote>' +
        '<blockquote>"The wicked shall be turned into hell, and all the nations that forget God." &mdash; Psalm 9:17</blockquote>' +
        '<h2>2. Believe that Jesus is God manifested in the flesh</h2>' +
        '<blockquote>"And without controversy great is the mystery of godliness: God was manifest in the flesh, justified in the Spirit, seen of angels, preached unto the Gentiles, believed on in the world, received up into glory." &mdash; 1 Timothy 3:16</blockquote>' +
        '<h2>3. Believe he died, shed his blood, was buried and rose again</h2>' +
        '<blockquote>"Moreover, brethren, I declare unto you the gospel which I preached unto you, which also ye have received, and wherein ye stand; By which also ye are saved, if ye keep in memory what I preached unto you, unless ye have believed in vain. For I delivered unto you first of all that which I also received, how that Christ died for our sins according to the scriptures; And that he was buried, and that he rose again the third day according to the scriptures." &mdash; 1 Corinthians 15:1&ndash;4</blockquote>' +
        '<blockquote>"Whom God hath set forth to be a propitiation through faith in his blood, to declare his righteousness for the remission of sins that are past, through the forbearance of God;" &mdash; Romans 3:25</blockquote>' +
        '<h2>These do NOT make you a Christian</h2>' +
        '<ul><li>Repenting of sins</li><li>Making Jesus Lord</li><li>Being a member of a church</li><li>Tithing</li><li>Being baptised (water)</li><li>Saying a sinner\'s prayer</li><li>Confessing with your mouth</li><li>Lordship Salvation</li></ul>' +
        '<h2>Once Saved, Always Saved</h2>' +
        '<p>A believer who has trusted the gospel cannot lose salvation, no matter what happens in their life. God\'s gift of eternal life is just that &mdash; eternal.</p>' +
        '<blockquote>"In whom ye also trusted, after that ye heard the word of truth, the gospel of your salvation: in whom also after that ye believed, ye were sealed with that holy Spirit of promise." &mdash; Ephesians 1:13</blockquote>' +
        '<h2>Watch the Gospel</h2>' +
        '<p><a href="https://www.youtube.com/watch?v=znP9Dr6tOzU" target="_blank">"THE GOSPEL THAT SAVES" by <span class="notranslate" translate="no">Robert Breaker</span></a></p>' +
        '<p><a href="https://www.youtube.com/playlist?list=PLNGhZnJavRf3f2_NI79j5GigC6xK5_YYq" target="_blank">Full Gospel Playlist on YouTube</a></p>' +
        '</div>';
    const resourcesHtml = '<div class="doc">' +
        '<h1>Resources</h1>' +
        '<p class="lead">KJB defence materials, studies on modern version corruption, and links to free Bible study resources.</p>' +

        '<h2>KJBI.org &mdash; Free Online Bible College</h2>' +
        '<p>King James Bible Institute by <span class="notranslate" translate="no">Robert Breaker</span> &amp; <span class="notranslate" translate="no">Robert Potthoff</span> &mdash; a free online Bible college for those who want to go deeper in God\'s Word.</p>' +
        lnk('https://kjbi.org', 'Visit KJBI.org', '') +

        '<h2>Why the KJB is God\'s Word</h2>' +
        '<p>The King James Bible is the only preserved Word of God in the English Language.</p>' +
        lnk('https://archive.org/details/wordgodwillkeepi0000faus', 'The Word of God Will Keep Its Infallibility', 'A historical book demonstrating that the KJB is the infallible, preserved Word of God in English. Read on Archive.org.') +
        lnk('https://www.scionofzion.com/nkjv.htm', 'Warning on the NKJV', 'The NKJV is not the same as the King James Bible. NKJV comparison.') +
        lnk('https://textusreceptusbibles.com/Differences_Between_Textus_Receptus_and_NaUbs', 'Textus Receptus Bibles', 'Research on the Textus Receptus &mdash; the Greek text underlying the King James Bible.') +

        '<h2>Verified KJB Preachers</h2>' +
        '<p>KJB-believing, soul-winning preachers.</p>' +
        lnk('https://www.youtube.com/@Robertbreaker3', '<span class="notranslate" translate="no">Robert Breaker</span>', 'KJB missionary evangelist. YouTube, TikTok (@robertbreaker), thecloudchurch.org') +
        lnk('https://www.instagram.com/robert.potthoff/', '<span class="notranslate" translate="no">Robert Potthoff</span>', 'Big Red Preacher &mdash; KJB soul winner. Instagram, Facebook, mission1611.com') +
        lnk('https://youtube.com/@josephgonzalez3', '<span class="notranslate" translate="no">Joseph Gonzalez</span>', 'KJB Elites &mdash; faithful preacher. YouTube, TikTok (@joyfullychurch), Joyfully Church') +
        lnk('https://www.seedofhopechurch.org/', '<span class="notranslate" translate="no">Ryan Poff</span>', 'Seed of Hope Church &mdash; KJB pastor. seedofhopechurch.org, YouTube (@ryan_poff)') +
        lnk('https://youtube.com/@av1611ministries', '<span class="notranslate" translate="no">Skyler (AV1611 Ministry)</span>', 'AV1611 Ministry &mdash; KJB defence and preaching. YouTube, TikTok') +
        lnk('https://www.youtube.com/@CrownOfThorns', '<span class="notranslate" translate="no">Crown of Thorns</span>', 'KJB preaching ministry on YouTube.') +
        lnk('https://youtube.com/@biblicalsalvation', '<span class="notranslate" translate="no">Paul Johnson</span>', 'Biblical Salvation &mdash; KJB preaching and Bible teaching. YouTube, TikTok') +
        lnk('https://www.youtube.com/channel/UCWBR5DmAi2XPMFRtb-wqHwg', '<span class="notranslate" translate="no">CPR Missions</span>', 'Church Planting and Revival Missions. YouTube, TikTok, Facebook, Instagram') +
        lnk('https://youtube.com/@jamesbrayall3?si=nXkuHAhyVvC_0KVg', '<span class="notranslate" translate="no">James Bray</span>', 'KJB preacher and Bible teacher on YouTube.') +

        '<h2>Personal Ministry Links</h2>' +
        lnk('https://godisgracious1031ministriescom.odoo.com/', '<span class="notranslate" translate="no">God is Gracious 1031 Ministries</span>', 'Ministry website') +
        lnk('https://youtube.com/@shawnr325av', 'YouTube', '@shawnr325av') +
        lnk('https://rumble.com/user/Godisgracious1031', 'Rumble', 'Godisgracious1031') +
        lnk('https://linktr.ee/shawnr325av', 'Linktree', 'linktr.ee/shawnr325av') +
        lnk('mailto:kingjamesbiblereader@outlook.sg', 'Contact the Ministry', 'kingjamesbiblereader@outlook.sg') +

        '<p class="note"><em>Note: The resources below are for educational purposes only. I may not affirm all doctrinal statements of every resource or ministry linked here. Please use discernment and compare all things to the King James Bible.</em></p>' +

        '<h2>How to Read the Bible</h2>' +
        lnk('https://avpublications.com/', 'AV Publications', 'Books and resources for King James Bible believers.') +

        '<h2>KJB Defence</h2>' +
        lnk('https://www.bibleprotector.com', 'Pure Cambridge Edition & Free Download', 'The definitive electronic text of the Pure Cambridge Edition of the KJB.') +
        lnk('https://archive.org/details/wordgodwillkeepi0000faus/page/18/mode/1up?q=%22King+James+Bible+is+infallible%22', 'The Word of God Will Keep Its Infallibility', 'Archive.org') +
        lnk('https://kjvcompare.com/', 'KJV Compare', 'Hundreds of changes made in modern versions of the Bible.') +
        lnk('https://www.scionofzion.com/kjcomparisons.html', 'Scion of Zion &mdash; KJB Comparisons', '') +
        lnk('https://www.scionofzion.com/1_john_5_7.htm', '1 John 5:7 Defence', '') +

        '<h2>Why Modern Versions Are Corrupt</h2>' +
        lnk('https://faithsaves.net/wp-content/uploads/2016/01/Theological-Heresies-of-Westcott-and-Hort-Waite.pdf', 'The Critical Text & Westcott-Hort', 'PDF') +
        lnk('https://www.scionofzion.com/nkjv.htm', 'NKJV Exposed', '') +
        lnk('https://www.youtube.com/watch?v=RmXBj2N9fhY&list=PLiMliTxa3H172BW4ANpBAavcIGVz-KXFW', 'A Lamp in the Dark', 'Full documentary') +
        lnk('https://youtube.com/playlist?list=PLNGhZnJavRf01ILv3TJu_ke4IPYcKcpJm&si=w73gmQRdA_3QbE48', 'KJB Defence Playlist', '') +
        lnk('https://www.youtube.com/watch?v=fyN680Y0Vwc', 'Gail Riplinger &mdash; The Sword Slays the Dragon', '') +
        lnk('https://www.youtube.com/watch?v=t6ck6KrVPIk', 'Irrefutable Proof: The KJB Superseded Hebrew and Greek', '') +
        lnk('https://www.av1611.org/articles', 'AV1611 Articles', '') +
        lnk('https://www.preservedwords.com/bp/index.html', 'Preserved Words', '') +
        lnk('https://brandplucked.com/kjbarticles.htm', 'Brandplucked &mdash; KJB Articles', '') +

        '<h2>1 John 5:7 Defence</h2>' +
        lnk('https://kjvdebate.com/blog/f/i-john-57-the-1st-century-latinspain-connection', '1 John 5:7 - The 1st Century Latin/Spain Connection', '') +
        lnk('https://catalog.obitel-minsk.com/blog/2021/08/the-authenticity-of-1-john-57-historical-evidence-and-the-church-tradition', 'The Authenticity of 1 John 5:7', '') +
        lnk('https://textus-receptus.com/wiki/1_John_5:7', 'Textus Receptus - 1 John 5:7', '') +
        lnk('https://kjvdebate.com/pdf', 'KJV Debate - 1 John 5:7 PDF', '') +

        '<h2>Westcott & Hort Heresies</h2>' +
        lnk('https://faithsaves.net/wp-content/uploads/2016/01/Theological-Heresies-of-Westcott-and-Hort-Waite.pdf', 'Theological Heresies of Westcott and Hort', 'PDF') +
        lnk('https://scatteredchristrians.org/WescottHort.html', 'Scattered Christians - Westcott & Hort', '') +
        lnk('https://textusreceptusbibles.com/Editorial/Umlauts', 'Textus Receptus Bibles - Editorial Issues', '') +
        lnk('https://textusreceptusbibles.com/Differences_Between_Textus_Receptus_and_NaUbs', 'Differences Between Textus Receptus and NA/UBS', '') +

        '<h2>NKJV Exposed</h2>' +
        lnk('https://www.av1611.org/nkjv.html', 'AV1611 - NKJV Exposed', '') +
        lnk('https://www.tbsbibles.org/page/WhatTodaysChristianNeedsToKnowAboutTheNewKingJamesVersion', 'TBS - What Today\'s Christian Needs to Know About NKJV', '') +
        lnk('https://www.tbsbibles.org/page/DoesTheNKJVLiveUpToItsClaims', 'TBS - Does the NKJV Live Up to Its Claims?', '') +
        lnk('https://www.tbsbibles.org/page/TheNewKingJamesVersion', 'TBS - The New King James Version Overview', '') +
        lnk('https://cdn.ymaws.com/www.tbsbibles.org/resource/collection/D4DCAF37-AEB6-4CEC-880F-FD229A90560F/An-Examination-of-NKJV-Part-1.pdf', 'TBS - An Examination of the NKJV (Parts 1 & 2)', '') +

        '<h2>Living Bible Exposed</h2>' +
        lnk('https://cdn.ymaws.com/www.tbsbibles.org/resource/collection/D4DCAF37-AEB6-4CEC-880F-FD229A90560F/The-Living-Bible.pdf', 'TBS - The Living Bible Exposed', 'PDF') +
        lnk('https://www.jesus-is-savior.com/Bible/Living%20Bible/lb_exposed.htm', 'Jesus is Savior - Living Bible Exposed', '') +
        lnk('https://jesus-is-savior.com/Bible/NLT/nlt_exposed.htm', 'Jesus is Savior - NLT Bible Exposed', '') +

        '<h2>ESV & NIV Exposed</h2>' +
        lnk('https://brandplucked.com/is-the-esv-inerrant.html', 'Brandplucked - Is the ESV Inerrant?', '') +
        lnk('https://brandplucked.com/theesv.htm', 'Brandplucked - The ESV Examined', '') +
        lnk('https://www.tbsbibles.org/page/EnglishStandardVersion', 'TBS - English Standard Version', '') +
        lnk('https://www.av1611.org/kjv/nivteen.html', 'AV1611 - NIV Exposed', '') +
        lnk('https://www.jesusisprecious.org/bible/niv/acts_8-37_missing.htm', 'Jesus is Precious - NIV Missing Verses', '') +
        lnk('https://www.scionofzion.com/niv%201984%20and%202011.html', 'Scion of Zion - NIV 1984 vs 2011', '') +
        lnk('https://www.jesus-is-savior.com/Bible/NIV/new_international_version_exposed.htm', 'Jesus is Savior - NIV Exposed', '') +
        '</div>';
    const aboutHtml = '<div style="max-width:800px;margin:0 auto;">' +
        '<h1 style="text-align:center;margin-bottom:16px;">About</h1>' +
        '<hr style="margin-bottom:32px;">' +
        '<div style="margin-bottom:32px;">' +
        '<h2 style="margin-bottom:12px;">About the Ministry</h2>' +
        '<p style="margin-bottom:16px;">I\'m Shawn, a firm believer that the King James Bible is the pure, infallible, perfect Word of God in the English language. I am a dispensational salvationist, rightly dividing the word of truth.</p>' +
        '<ul style="line-height:1.8;">' +
        '<li>I reject Catholicism, Calvinism, Pentecostalism, Church of God, Mormonism, Jehovah\'s Witnesses, etc.</li>' +
        '<li>I believe in the blood-stained gospel as the only way to be saved, and I reject "repent of sins to be saved" (ROYS), "confess with your mouth to be saved," Lordship Salvation, infant baptism, baptism regeneration, etc.</li>' +
        '<li>To be saved, you must believe that Jesus is God, that He shed His blood on Calvary, died, was buried, and rose again for your justification.</li>' +
        '<li>I believe in OSAS (Once Saved, Always Saved): a believer who has trusted the gospel cannot lose salvation, no matter what happens in their life.</li>' +
        '</ul>' +
        '</div>' +
        '<div style="margin-bottom:32px;">' +
        '<h2 style="margin-bottom:16px;">Statement of Faith</h2>' +
        '<div style="margin-bottom:24px;">' +
        '<h3 style="margin-bottom:8px;">The King James Bible</h3>' +
        '<ul style="line-height:1.8;">' +
        '<li>Westcott and Hort created the Critical Text, based on manuscripts from the Vatican and Egypt. These manuscripts have hundreds of errors, deletions and additions to the Bible, attacking doctrines such as the Godhead/Trinity and deity of Christ. Their text was used in the Revised Version of 1881.</li>' +
        '<li>The King James Bible is the infallible, perfect Word of God in the English language.</li>' +
        '<li>Translated with the Textus Receptus (Received Text) that the historical church has always used.</li>' +
        '<li>Translated by godly men well versed in the Biblical languages who studied commentaries and foreign translations from an early age.</li>' +
        '<li>The Bible God has used for countless revivals and bringing the gospel to the world. It is mathematically proven to be a miracle.</li>' +
        '</ul>' +
        '</div>' +
        '<div style="margin-bottom:24px;">' +
        '<h3 style="margin-bottom:8px;">Satan & Hell</h3>' +
        '<ul style="line-height:1.8;">' +
        '<li>Satan is also known as the Devil, Lucifer and the king of Pride. His goal is to steal, kill and deceive the world &mdash; through things such as abortion, sodomy, and going after worldly things instead of what truly matters.</li>' +
        '<li>He deceives people that they are without a Saviour, that there is no God, no hell, and no afterlife.</li>' +
        '<li>All people come short of the glory of God and have committed sin.</li>' +
        '<li>The wages of sin is death and the wicked shall be turned into hell.</li>' +
        '<li>Hell is a place of torment day and night. Hell was created for Satan and his angels. Hell will be thrown into the lake of fire at the second death.</li>' +
        '</ul>' +
        '</div>' +
        '<div style="margin-bottom:24px;">' +
        '<h3 style="margin-bottom:8px;">Salvation & Pre-Tribulation Rapture</h3>' +
        '<ul style="line-height:1.8;">' +
        '<li>Jesus Christ is God manifested in the flesh, born of the virgin Mary.</li>' +
        '<li>Jesus Christ lived a perfect life, died on Calvary\'s cross, shed his blood, was buried and rose again on the third day.</li>' +
        '<li>Jesus went to heaven to put his precious blood in the mercy seat so we can have eternal life.</li>' +
        '<li>To be saved: Believe Jesus is God and that he died for your sins, shed his blood, was buried and rose again for your justification.</li>' +
        '<li>Repenting of sins, water baptism, making him Lord or letting him into your heart is not salvation.</li>' +
        '<li>I believe in the Pre-Tribulation Rapture where the church will meet in the clouds with our Saviour before the Antichrist reigns on earth.</li>' +
        '<li>Those in the 7-year tribulation will have to endure to the end, not take the mark, and be martyrs for Christ.</li>' +
        '<li>I believe Jesus will reign in the new heaven and earth after the white throne judgment.</li>' +
        '</ul>' +
        '</div>' +
        '</div>' +
        '<div style="margin-bottom:32px;">' +
        '<h2 style="margin-bottom:16px;">Pagan Holidays &amp; Traditions</h2>' +
        '<p style="margin-bottom:12px;">Many widely-observed holidays have roots in pagan customs that were later given a Christian veneer. Believers should study these origins for themselves.</p>' +
        '<ul style="line-height:1.8;">' +
        '<li>Easter &mdash; its name, timing and symbols (eggs, rabbits) trace back to pagan spring fertility festivals rather than scripture.</li>' +
        '<li>Christmas &mdash; December 25th and many of its customs (trees, wreaths, yule logs) originate in pagan winter solstice celebrations, not the biblical account of Christ\'s birth.</li>' +
        '<li>Halloween &mdash; descends from pagan harvest and death festivals (such as Samhain) later absorbed into the church calendar as &ldquo;All Hallows\' Eve.&rdquo;</li>' +
        '</ul>' +
        '<p style="margin-top:12px;"><a href="https://youtube.com/playlist?list=PLNGhZnJavRf183iEUeQHer5aKnlV3LWKP" target="_blank">Pagan Holidays Playlist on YouTube</a></p>' +
        '</div>' +
        '<div style="margin-bottom:32px;">' +
        '<h2 style="margin-bottom:12px;">Why I Am Not... Series</h2>' +
        '<p style="margin-bottom:12px;">I reject Catholicism, Calvinism, Pentecostalism, Church of God, Mormonism, Jehovah\'s Witnesses, etc. This video series by <span class="notranslate" translate="no">Robert Breaker</span> examines why various religious movements depart from the truth of scripture.</p>' +
        '<p style="margin-top:12px;"><a href="https://youtube.com/playlist?list=PLNGhZnJavRf293XCMldBgwRpQ4U1o8uEf" target="_blank">Why I Am Not... Series on YouTube</a></p>' +
        '</div>' +
        '<div style="margin-bottom:32px;">' +
        '<h2 style="margin-bottom:12px;">Links & Contact</h2>' +
        '<ul style="line-height:1.8;">' +
        '<li><a href="https://godisgracious1031ministriescom.odoo.com/" target="_blank">God is Gracious 1031 Ministries</a></li>' +
        '<li><a href="https://youtube.com/@shawnr325av" target="_blank">YouTube: @shawnr325av</a></li>' +
        '<li><a href="https://rumble.com/user/Godisgracious1031" target="_blank">Rumble: Godisgracious1031</a></li>' +
        '<li><a href="https://linktr.ee/shawnr325av" target="_blank">Linktree: linktr.ee/shawnr325av</a></li>' +
        '<li><a href="mailto:kingjamesbiblereader@outlook.sg">Email: kingjamesbiblereader@outlook.sg</a></li>' +
        '</ul>' +
        '</div>' +
        '</div>';

    // ── DOWNLOAD MODE: build the self-contained single-file HTML Bible
    // dynamically so it always carries the latest banner ("HTML mode" +
    // Ctrl-F find tip) and content. Runs here because it needs the
    // Gospel/Resources/About consts defined above. ──
    if (isDownload) {
      const dlBibleData = await loadBible();

      let dlBooksHtml = '';
      for (let bi = 0; bi < BOOK_ORDER.length; bi++) {
        dlBooksHtml += buildBookHtml(dlBibleData, bi);
      }

      let dlIndex = '<div class="fb-index"><p class="fb-index-title">Quick Links &mdash; tap a book to jump</p>';
      dlIndex += '<p class="fb-testament">Old Testament</p><p class="fb-books">';
      const dlOtEnd = BOOK_ORDER.indexOf('Malachi');
      for (let i = 0; i <= dlOtEnd; i++) {
        dlIndex += '<a href="#b' + i + '" class="notranslate" translate="no">' + esc(BOOK_ORDER[i]) + '</a> ';
      }
      dlIndex += '</p><p class="fb-testament">New Testament</p><p class="fb-books">';
      for (let i = dlOtEnd + 1; i < BOOK_ORDER.length; i++) {
        dlIndex += '<a href="#b' + i + '" class="notranslate" translate="no">' + esc(BOOK_ORDER[i]) + '</a> ';
      }
      dlIndex += '</p><p class="fb-testament">More</p><p class="fb-books">' +
        '<a href="#gospel">Gospel</a> <a href="#resources">Resources</a> <a href="#about">About</a>' +
        '</p></div>';

      const dlExtras =
        '<div class="fb-book"><a name="gospel" id="gospel"></a><p class="fb-top"><a href="#top">&uarr; Back to top</a></p>' + gospelHtml + '</div>' +
        '<div class="fb-book"><a name="resources" id="resources"></a><p class="fb-top"><a href="#top">&uarr; Back to top</a></p>' + resourcesHtml + '</div>' +
        '<div class="fb-book"><a name="about" id="about"></a><p class="fb-top"><a href="#top">&uarr; Back to top</a></p>' + aboutHtml + '</div>';

      const dlBanner = '<div class="banner">' +
        '<div class="banner-icon">&#128196;</div>' +
        '<div class="banner-body">' +
        '<h2 class="banner-title">HTML Mode</h2>' +
        '<p class="banner-desc">This is a plain, self-contained HTML copy of the King James Bible. It works fully offline in any browser &mdash; no internet, app or JavaScript required.</p>' +
        '<ul class="banner-tips">' +
        '<li><b>To find a word or verse:</b> on desktop press <b>Ctrl + F</b> (<b>&#8984; + F</b> on Mac); on mobile open your browser menu and tap <b>Find in page</b>.</li>' +
        '<li>Use the quick links below to jump to any book, the Gospel, Resources or About.</li>' +
        '<li>Found a bug? Email <a href="mailto:kingjamesbiblereader@outlook.sg">kingjamesbiblereader@outlook.sg</a>.</li>' +
        '</ul>' +
        '</div>' +
        '</div>';

      const dlBody = '<a name="top" id="top"></a>' +
        '<p class="fb-intro">The complete King James Bible on a single page, plus the Gospel, Resources and About sections. Use the quick links to jump to any book instantly.</p>' +
        dlIndex + '<div id="fb-books-target">' + dlBooksHtml + '</div>' + dlExtras;

      const dlStyle = '*{margin:0;padding:0;box-sizing:border-box;}body{background:#f5f5f7;color:#1a1a1a;font-family:Georgia,serif;font-size:16px;line-height:1.6;}.hdr{background:#2d2a6e;color:#fff;padding:16px;text-align:center;}.hdr h1{font-size:22px;}.hdr p{font-size:12px;color:#cfcfe8;}.wrap{max-width:760px;margin:0 auto;padding:16px;}.verse{display:block;margin:20px 0 10px 0;line-height:1.5;}.vn{font-weight:bold;color:#2d2a6e;font-size:11px;margin-right:4px;}.subscript{text-align:center;color:#555;font-size:14px;margin:0 0 16px;}.colophon{text-align:center;color:#555;font-size:14px;margin:18px 0 0;padding-top:12px;border-top:1px solid #e0e0ec;}.pil{color:#888;display:inline;white-space:nowrap;}em{font-style:italic;}.doc{max-width:760px;margin:0 auto;}.doc h1{font-size:26px;color:#2d2a6e;margin:12px 0 24px;text-align:center;}.doc h2{font-size:19px;color:#2d2a6e;margin:44px 0 18px;padding-bottom:8px;border-bottom:1px solid #e0e0ec;}.doc h3{font-size:16px;color:#444;margin:30px 0 14px;}.doc p{margin:0 0 22px;line-height:1.85;}.doc p.lead{color:#555;font-size:17px;margin-bottom:36px;}.doc p.note{color:#777;font-size:13px;margin:32px 0;}.doc ul{margin:0 0 28px 28px;list-style-type:disc;}.doc li{margin-bottom:16px;line-height:1.75;padding-left:6px;}.doc blockquote{margin:0 0 22px;padding-left:18px;border-left:3px solid #c9c7e0;color:#444;font-style:italic;line-height:1.85;}.doc a{color:#2d2a6e;}.doc p.rlnk{margin:0 0 16px;}.doc p.rlnk span{color:#666;font-style:normal;}.banner{background:linear-gradient(135deg,#2d2a6e 0%,#3d3a8e 100%);color:#fff;padding:28px 20px;font-family:Arial,sans-serif;}.banner-icon{font-size:36px;text-align:center;margin-bottom:8px;}.banner-body{max-width:640px;margin:0 auto;}.banner-title{font-size:20px;font-weight:bold;text-align:center;margin-bottom:10px;letter-spacing:1px;text-transform:uppercase;}.banner-desc{font-size:14px;line-height:1.6;text-align:center;margin-bottom:18px;opacity:0.92;}.banner-tips{margin:0;padding:0;list-style:none;}.banner-tips li{font-size:13px;line-height:1.6;margin-bottom:10px;padding-left:22px;position:relative;}.banner-tips li:before{content:"\\25B8";position:absolute;left:0;color:#a8a4d8;font-weight:bold;}.banner-tips li b{font-weight:bold;}.banner a{color:#c8c4f0;font-weight:bold;text-decoration:underline;}.fb-intro{font-size:15px;color:#555;margin-bottom:16px;line-height:1.6;}.fb-index{background:#fff;border:1px solid #e0e0ec;padding:14px 16px;margin-bottom:24px;}.fb-index-title{font-size:13px;font-weight:bold;color:#333;font-family:Arial,sans-serif;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;}.fb-testament{font-size:15px;font-weight:bold;color:#2d2a6e;margin:12px 0 6px;}.fb-books{line-height:2.2;}.fb-books a{display:inline-block;padding:3px 9px;margin:2px;background:#f7f7fb;border:1px solid #e0e0ec;color:#2d2a6e;text-decoration:none;font-size:13px;font-family:Arial,sans-serif;}.fb-book{margin-bottom:32px;border-top:2px solid #e0e0ec;padding-top:8px;}.fb-bookname{font-size:21px;color:#2d2a6e;text-align:center;margin:16px 0 4px;}.fb-top{text-align:center;margin-bottom:12px;}.fb-top a{font-size:12px;color:#888;text-decoration:none;font-family:Arial,sans-serif;}.fb-chap{font-size:15px;color:#666;font-weight:bold;margin:20px 0 8px;font-family:Arial,sans-serif;border-bottom:1px solid #eee;padding-bottom:4px;}.fb-chaplinks{margin:0 0 16px;line-height:2.2;}.fb-chaplinks-label{font-size:13px;font-weight:bold;color:#333;font-family:Arial,sans-serif;margin-right:6px;}.fb-chaplinks a{display:inline-block;min-width:24px;text-align:center;padding:3px 7px;margin:2px;background:#f7f7fb;border:1px solid #e0e0ec;color:#2d2a6e;text-decoration:none;font-size:13px;font-family:Arial,sans-serif;}.fb-chaptop{font-size:11px;font-weight:normal;color:#888;text-decoration:none;font-family:Arial,sans-serif;margin-left:8px;}';

      const dlHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>KJB Reader (HTML Bible)</title><style>' + dlStyle + '</style></head><body><div class="hdr"><h1 class="notranslate" translate="no">KJB Reader</h1><p class="notranslate" translate="no">King James Bible &mdash; Pure Cambridge Edition</p></div>' + dlBanner + '<div class="wrap" id="wrap">' + dlBody + '</div></body></html>';

      return new Response(dlHtml, { headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'",
        'Content-Disposition': 'attachment; filename="kjb-bible.html"',
        'Cache-Control': 'public, max-age=86400'
      } });
    }

    {
      // The ENTIRE Bible rendered inline on one page, with anchor quick-links
      // at the top, plus Gospel/Resources/About embedded. Navigation between
      // books/chapters is instant (in-page #anchors, no server calls).
      const bible = await loadBible();

      // The Full Bible is a single self-contained page, so all internal jumps
      // are PLAIN fragment links ("#bN"). They never hit the network, so
      // navigation works 100% offline. Links become "#bN".
      const fbBase = '';

      // Quick-link index (jump to each book)
      let index = '<div class="fb-index"><p class="fb-index-title">Quick Links &mdash; tap a book to jump</p>';
      index += '<p class="fb-testament">Old Testament</p><p class="fb-books">';
      const otEnd = BOOK_ORDER.indexOf('Malachi');
      for (let i = 0; i <= otEnd; i++) {
        index += '<a href="' + fbBase + '#b' + i + '" class="notranslate" translate="no">' + esc(BOOK_ORDER[i]) + '</a> ';
      }
      index += '</p><p class="fb-testament">New Testament</p><p class="fb-books">';
      for (let i = otEnd + 1; i < BOOK_ORDER.length; i++) {
        index += '<a href="' + fbBase + '#b' + i + '" class="notranslate" translate="no">' + esc(BOOK_ORDER[i]) + '</a> ';
      }
      index += '</p><p class="fb-testament">More</p><p class="fb-books">' +
        '<a href="' + fbBase + '#gospel">Gospel</a> <a href="' + fbBase + '#resources">Resources</a> <a href="' + fbBase + '#about">About</a>' +
        '</p></div>';

      // Render ALL 66 books INLINE directly into the HTML. This requires ZERO
      // JavaScript to display, so it works on ancient browsers (IE8/IE9/Vista)
      // where XHR chunk loading fails. The page is fully server-rendered.
      let booksHtml = '';
      for (let bi = 0; bi < BOOK_ORDER.length; bi++) {
        booksHtml += buildBookHtml(bible, bi);
      }
      const body = '<div id="fb-books-target">' + booksHtml + '</div>';

      const extras =
        '<div class="fb-book"><a name="gospel" id="gospel"></a><p class="fb-top"><a href="' + fbBase + '#top">&uarr; Back to top</a></p>' + gospelHtml + '</div>' +
        '<div class="fb-book"><a name="resources" id="resources"></a><p class="fb-top"><a href="' + fbBase + '#top">&uarr; Back to top</a></p>' + resourcesHtml + '</div>' +
        '<div class="fb-book"><a name="about" id="about"></a><p class="fb-top"><a href="' + fbBase + '#top">&uarr; Back to top</a></p>' + aboutHtml + '</div>';

      // Serve the download THROUGH this same function (?download=1) so it stays
      // on the Cloudflare TLS-1.0 origin — reachable by IE9. (base44.app is
      // TLS-1.2-only and would fail on IE9.)
      const appIdQs = (!isCustomHost && appId ? '&app_id=' + encodeURIComponent(appId) : '');
      const HTML_FILE_URL = basePath + '?download=1' + appIdQs;
      const TXT_URL = basePath + '?format=txt' + appIdQs;
      const RTF_URL = basePath + '?format=rtf' + appIdQs;
      const DOC_URL = basePath + '?format=doc' + appIdQs;
      const downloadBox = '<div class="dl-box"><b>&#128190; Download this Bible as a single file</b>' +
        '<p>Save the entire King James Bible (all 66 books, plus Gospel, Resources and About) as one self-contained HTML file. It needs no internet and no app &mdash; ideal for very old computers, or for keeping your own offline copy.</p>' +
        '<p><a class="dl-btn" href="' + HTML_FILE_URL + '" download="kjb-bible.html">Download HTML File (about 6 MB)</a></p>' +
        '<p class="dl-how"><b>How to use it:</b> Tap the link above to save the file, then open it by double-tapping &mdash; it works in any browser, even offline. For PDF, RTF, Word and TXT versions, use the Download Bible section in Settings (main app only).</p>' +
        '</div>';

      bodyInner = '<a name="top" id="top"></a>' +
        '<p class="fb-intro">The complete King James Bible on a single page, plus the Gospel, Resources and About sections. Use the quick links to jump to any book instantly.</p>' +
        downloadBox + index + body + extras;
    }

    // The Bible is now rendered INLINE (no JS chunk loading), so no loader
    // script is required — the page works on browsers with JavaScript disabled
    // or unsupported (IE8/IE9/Vista).

    const banner = '<div class="banner"><b>&#9888; Legacy mode &mdash; for old browsers like Internet Explorer</b>' +
      'This version is unsupported, may contain bugs, and could have security issues. Please upgrade to a modern browser (Chrome, Firefox, Edge or Safari) &mdash; or upgrade your device &mdash; for the best, most secure experience.' +
      '<ul>' +
      '<li>Tested on Windows 8.1 (Internet Explorer 11). Does not work on Internet Explorer 9.</li>' +
      '<li>If pages will not load on a very old computer, use the <b>Download HTML File</b> button below &mdash; it works fully offline in any browser.</li>' +
      '<li>Installing as an app (PWA) is not supported here.</li>' +
      '<li><b>To find a word or verse:</b> on desktop press <b>Ctrl + F</b> (<b>&#8984; + F</b> on Mac); on mobile open your browser menu and tap <b>Find in page</b>.</li>' +
      '<li>YouTube videos and some external links may not open or play on old browsers.</li>' +
      '<li>Found a bug? Email <a href="mailto:kingjamesbiblereader@outlook.sg">kingjamesbiblereader@outlook.sg</a>.</li>' +
      '</ul></div>';

    const backLinkHtml = hideBackLink ? '' : '<a href="https://kingjamesbiblereader.com" target="_top" class="back">&larr; Back to KJB Reader</a>';
    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>KJB Reader (Legacy)</title><style>' + STYLE + (isDark ? DARK_STYLE : '') + '</style></head><body><div class="hdr">' + backLinkHtml + '<h1 class="notranslate" translate="no">KJB Reader (Legacy)</h1><p class="notranslate" translate="no">King James Bible &mdash; Pure Cambridge Edition</p></div>' + banner + '<div class="wrap" id="wrap">' + bodyInner + '</div></body></html>';

    return new Response(html, { headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'",
      // The SHELL page is SMALL (no inlined Bible — books load as separate
      // immutable chunks). Allow the BROWSER's own HTTP cache to store it for a
      // short window so a refresh works OFFLINE even if the Service Worker
      // isn't controlling the page yet (e.g. right after first install, or in
      // browsers where the SW didn't claim the tab). The short max-age +
      // stale-while-revalidate means the latest shell/loader still loads
      // promptly when back online.
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=604800',
      'Vary': 'Accept-Encoding'
    } });
  } catch (error) {
    return new Response('<!DOCTYPE html><html><body style="font-family:Arial;padding:20px;color:#c00;">Error: ' + esc(error.message) + '</body></html>', { status: 500, headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'" } });
  }
});