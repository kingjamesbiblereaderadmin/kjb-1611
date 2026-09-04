// Shared PCE Bible text loader/parser for backend functions.
// Mirrors the frontend's src/lib/biblePceParser.js exactly (same file format,
// same book-title/chapter/verse detection, same paragraph/pilcrow handling),
// so the API returns text with IDENTICAL casing, [brackets], and ¶ pilcrows
// as the website reader — including the traditional ALL-CAPS first word of
// each chapter's verse 1, which is already present in the source file.

export const ABBR_TO_NAME: Record<string, string> = {
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

export const NAME_TO_FULL: Record<string, string> = {
  'Genesis': 'The First Book of Moses, called Genesis',
  'Exodus': 'The Second Book of Moses, called Exodus',
  'Leviticus': 'The Third Book of Moses, called Leviticus',
  'Numbers': 'The Fourth Book of Moses, called Numbers',
  'Deuteronomy': 'The Fifth Book of Moses, called Deuteronomy',
  'Joshua': 'The Book of Joshua',
  'Judges': 'The Book of Judges',
  'Ruth': 'The Book of Ruth',
  '1 Samuel': 'The First Book of Samuel, Otherwise called, The First Book Of The Kings',
  '2 Samuel': 'The Second Book of Samuel, Otherwise called, The Second Book Of The Kings',
  '1 Kings': 'The First Book Of The Kings, Commonly called, The Third Book Of The Kings',
  '2 Kings': 'The Second Book Of The Kings, Commonly called, The Fourth Book Of The Kings',
  '1 Chronicles': 'The First Book of the Chronicles',
  '2 Chronicles': 'The Second Book of the Chronicles',
  'Ezra': 'Ezra',
  'Nehemiah': 'The Book of Nehemiah',
  'Esther': 'The Book of Esther',
  'Job': 'The Book of Job',
  'Psalms': 'The Book of Psalms',
  'Proverbs': 'The Proverbs',
  'Ecclesiastes': 'Ecclesiastes; or, the Preacher',
  'Song of Solomon': 'The Song of Solomon',
  'Isaiah': 'The Book of the Prophet Isaiah',
  'Jeremiah': 'The Book of the Prophet Jeremiah',
  'Lamentations': 'The Lamentations of Jeremiah',
  'Ezekiel': 'The Book of the Prophet Ezekiel',
  'Daniel': 'The Book of Daniel',
  'Hosea': 'Hosea',
  'Joel': 'Joel',
  'Amos': 'Amos',
  'Obadiah': 'Obadiah',
  'Jonah': 'Jonah',
  'Micah': 'Micah',
  'Nahum': 'Nahum',
  'Habakkuk': 'Habakkuk',
  'Zephaniah': 'Zephaniah',
  'Haggai': 'Haggai',
  'Zechariah': 'Zechariah',
  'Malachi': 'Malachi',
  'Matthew': 'The Gospel According to Saint Matthew',
  'Mark': 'The Gospel According to Saint Mark',
  'Luke': 'The Gospel According to Saint Luke',
  'John': 'The Gospel According to Saint John',
  'Acts': 'The Acts of the Apostles',
  'Romans': 'The Epistle of Paul the Apostle to the Romans',
  '1 Corinthians': 'The First Epistle of Paul the Apostle to the Corinthians',
  '2 Corinthians': 'The Second Epistle of Paul the Apostle to the Corinthians',
  'Galatians': 'The Epistle of Paul the Apostle to the Galatians',
  'Ephesians': 'The Epistle of Paul the Apostle to the Ephesians',
  'Philippians': 'The Epistle of Paul the Apostle to the Philippians',
  'Colossians': 'The Epistle of Paul the Apostle to the Colossians',
  '1 Thessalonians': 'The First Epistle of Paul the Apostle to the Thessalonians',
  '2 Thessalonians': 'The Second Epistle of Paul the Apostle to the Thessalonians',
  '1 Timothy': 'The First Epistle of Paul the Apostle to Timothy',
  '2 Timothy': 'The Second Epistle of Paul the Apostle to Timothy',
  'Titus': 'The Epistle of Paul to Titus',
  'Philemon': 'The Epistle of Paul to Philemon',
  'Hebrews': 'The Epistle of Paul the Apostle to the Hebrews',
  'James': 'The General Epistle of James',
  '1 Peter': 'The First Epistle General of Peter',
  '2 Peter': 'The Second Epistle General of Peter',
  '1 John': 'The First Epistle General of John',
  '2 John': 'The Second Epistle of John',
  '3 John': 'The Third Epistle of John',
  'Jude': 'The General Epistle of Jude',
  'Revelation': 'The Revelation of Saint John the Divine',
};

export const BOOK_ORDER = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

// Psalm superscriptions (titles above verse 1) — same content as
// src/lib/bibleSubscripts.js SUBSCRIPTS, used to attach a `superscription`
// field to verse-1 API responses (the PCE file's own superscription line is
// skipped during parsing, matching the frontend).
export const SUBSCRIPTS: Record<string, string> = {
  'Psalms:3':   'A Psalm of David, when he fled from Absalom his son.',
  'Psalms:4':   'To the chief Musician on Neginoth, A Psalm of David.',
  'Psalms:5':   'To the chief Musician upon Nehiloth, A Psalm of David.',
  'Psalms:6':   'To the chief Musician on Neginoth upon Sheminith, A Psalm of David.',
  'Psalms:7':   'Shiggaion of David, which he sang unto the LORD, concerning the words of Cush the Benjamite.',
  'Psalms:8':   'To the chief Musician upon Gittith, A Psalm of David.',
  'Psalms:9':   'To the chief Musician upon Muth-labben, A Psalm of David.',
  'Psalms:11':  'To the chief Musician, [A] [Psalm] of David.',
  'Psalms:12':  'To the chief Musician upon Sheminith, A Psalm of David.',
  'Psalms:13':  'To the chief Musician, A Psalm of David.',
  'Psalms:14':  'To the chief Musician, [A] [Psalm] of David.',
  'Psalms:15':  'A Psalm of David.',
  'Psalms:16':  'Michtam of David.',
  'Psalms:17':  'A Prayer of David.',
  'Psalms:18':  'To the chief Musician, [A] [Psalm] of David, the servant of the LORD, who spake unto the LORD the words of this song in the day [that] the LORD delivered him from the hand of all his enemies, and from the hand of Saul: And he said,',
  'Psalms:19':  'To the chief Musician, A Psalm of David.',
  'Psalms:20':  'To the chief Musician, A Psalm of David.',
  'Psalms:21':  'To the chief Musician, A Psalm of David.',
  'Psalms:22':  'To the chief Musician upon Aijeleth Shahar, A Psalm of David.',
  'Psalms:23':  'A Psalm of David.',
  'Psalms:24':  'A Psalm of David.',
  'Psalms:25':  '[A] [Psalm] of David.',
  'Psalms:26':  '[A] [Psalm] of David.',
  'Psalms:27':  '[A] [Psalm] of David.',
  'Psalms:28':  '[A] [Psalm] of David.',
  'Psalms:29':  'A Psalm of David.',
  'Psalms:30':  'A Psalm [and] Song [at] the dedication of the house of David.',
  'Psalms:31':  'To the chief Musician, A Psalm of David.',
  'Psalms:32':  '[A] [Psalm] of David, Maschil.',
  'Psalms:34':  '[A] [Psalm] of David, when he changed his behaviour before Abimelech; who drove him away, and he departed.',
  'Psalms:35':  '[A] [Psalm] of David.',
  'Psalms:36':  'To the chief Musician, [A] [Psalm] of David the servant of the LORD.',
  'Psalms:37':  '[A] [Psalm] of David.',
  'Psalms:38':  'A Psalm of David, to bring to remembrance.',
  'Psalms:39':  'To the chief Musician, [even] to Jeduthun, A Psalm of David.',
  'Psalms:40':  'To the chief Musician, A Psalm of David.',
  'Psalms:41':  'To the chief Musician, A Psalm of David.',
  'Psalms:42':  'To the chief Musician, Maschil, for the sons of Korah.',
  'Psalms:44':  'To the chief Musician for the sons of Korah, Maschil.',
  'Psalms:45':  'To the chief Musician upon Shoshannim, for the sons of Korah, Maschil, A Song of loves.',
  'Psalms:46':  'To the chief Musician for the sons of Korah, A Song upon Alamoth.',
  'Psalms:47':  'To the chief Musician, A Psalm for the sons of Korah.',
  'Psalms:48':  'A Song [and] Psalm for the sons of Korah.',
  'Psalms:49':  'To the chief Musician, A Psalm for the sons of Korah.',
  'Psalms:50':  'A Psalm of Asaph.',
  'Psalms:51':  'To the chief Musician, A Psalm of David, when Nathan the prophet came unto him, after he had gone in to Bath-sheba.',
  'Psalms:52':  'To the chief Musician, Maschil, [A] [Psalm] of David, when Doeg the Edomite came and told Saul, and said unto him, David is come to the house of Ahimelech.',
  'Psalms:53':  'To the chief Musician upon Mahalath, Maschil, [A] [Psalm] of David.',
  'Psalms:54':  'To the chief Musician on Neginoth, Maschil, [A] [Psalm] of David, when the Ziphims came and said to Saul, Doth not David hide himself with us?',
  'Psalms:55':  'To the chief Musician on Neginoth, Maschil, [A] [Psalm] of David.',
  'Psalms:56':  'To the chief Musician upon Jonath-elem-rechokim, Michtam of David, when the Philistines took him in Gath.',
  'Psalms:57':  'To the chief Musician, Al-taschith, Michtam of David, when he fled from Saul in the cave.',
  'Psalms:58':  'To the chief Musician, Al-taschith, Michtam of David.',
  'Psalms:59':  'To the chief Musician, Al-taschith, Michtam of David; when Saul sent, and they watched the house to kill him.',
  'Psalms:60':  'To the chief Musician upon Shushan-eduth, Michtam of David, to teach; when he strove with Aram-naharaim and with Aram-zobah, when Joab returned, and smote of Edom in the valley of salt twelve thousand.',
  'Psalms:61':  'To the chief Musician upon Neginah, [A] [Psalm] of David.',
  'Psalms:62':  'To the chief Musician, to Jeduthun, A Psalm of David.',
  'Psalms:63':  'A Psalm of David, when he was in the wilderness of Judah.',
  'Psalms:64':  'To the chief Musician, A Psalm of David.',
  'Psalms:65':  'To the chief Musician, A Psalm [and] Song of David.',
  'Psalms:66':  'To the chief Musician, A Song [or] Psalm.',
  'Psalms:67':  'To the chief Musician on Neginoth, A Psalm [or] Song.',
  'Psalms:68':  'To the chief Musician, A Psalm [or] Song of David.',
  'Psalms:69':  'To the chief Musician upon Shoshannim, [A] [Psalm] of David.',
  'Psalms:70':  'To the chief Musician, [A] [Psalm] of David, to bring to remembrance.',
  'Psalms:72':  '[A] [Psalm] for Solomon.',
  'Psalms:73':  'A Psalm of Asaph.',
  'Psalms:74':  'Maschil of Asaph.',
  'Psalms:75':  'To the chief Musician, Al-taschith, A Psalm [or] Song of Asaph.',
  'Psalms:76':  'To the chief Musician on Neginoth, A Psalm [or] Song of Asaph.',
  'Psalms:77':  'To the chief Musician, to Jeduthun, A Psalm of Asaph.',
  'Psalms:78':  'Maschil of Asaph.',
  'Psalms:79':  'A Psalm of Asaph.',
  'Psalms:80':  'To the chief Musician upon Shoshannim-Eduth, A Psalm of Asaph.',
  'Psalms:81':  'To the chief Musician upon Gittith, [A] [Psalm] of Asaph.',
  'Psalms:82':  'A Psalm of Asaph.',
  'Psalms:83':  'A Song [or] Psalm of Asaph.',
  'Psalms:84':  'To the chief Musician upon Gittith, A Psalm for the sons of Korah.',
  'Psalms:85':  'To the chief Musician, A Psalm for the sons of Korah.',
  'Psalms:86':  'A Prayer of David.',
  'Psalms:87':  'A Psalm [or] Song for the sons of Korah.',
  'Psalms:88':  'A Song [or] Psalm for the sons of Korah, to the chief Musician upon Mahalath Leannoth, Maschil of Heman the Ezrahite.',
  'Psalms:89':  'Maschil of Ethan the Ezrahite.',
  'Psalms:90':  'A Prayer of Moses the man of God.',
  'Psalms:92':  'A Psalm [or] Song for the sabbath day.',
  'Psalms:98':  'A Psalm.',
  'Psalms:100': 'A Psalm of praise.',
  'Psalms:101': 'A Psalm of David.',
  'Psalms:102': 'A Prayer of the afflicted, when he is overwhelmed, and poureth out his complaint before the LORD.',
  'Psalms:103': '[A] [Psalm] of David.',
  'Psalms:108': 'A Song [or] Psalm of David.',
  'Psalms:109': 'To the chief Musician, A Psalm of David.',
  'Psalms:110': 'A Psalm of David.',
  'Psalms:120': 'A Song of degrees.',
  'Psalms:121': 'A Song of degrees.',
  'Psalms:122': 'A Song of degrees of David.',
  'Psalms:123': 'A Song of degrees.',
  'Psalms:124': 'A Song of degrees of David.',
  'Psalms:125': 'A Song of degrees.',
  'Psalms:126': 'A Song of degrees.',
  'Psalms:127': 'A Song of degrees for Solomon.',
  'Psalms:128': 'A Song of degrees.',
  'Psalms:129': 'A Song of degrees.',
  'Psalms:130': 'A Song of degrees.',
  'Psalms:131': 'A Song of degrees of David.',
  'Psalms:132': 'A Song of degrees.',
  'Psalms:133': 'A Song of degrees of David.',
  'Psalms:134': 'A Song of degrees.',
  'Psalms:138': '[A] [Psalm] of David.',
  'Psalms:139': 'To the chief Musician, A Psalm of David.',
  'Psalms:140': 'To the chief Musician, A Psalm of David.',
  'Psalms:141': 'A Psalm of David.',
  'Psalms:142': 'Maschil of David; A Prayer when he was in the cave.',
  'Psalms:143': 'A Psalm of David.',
  'Psalms:144': '[A] [Psalm] of David.',
  'Psalms:145': 'David\'s [Psalm] of praise.',
};

// Colophons (epistle subscriptions) — same content as src/lib/bibleSubscripts.js
// COLOPHONS, attached to the last chapter of the relevant books.
export const COLOPHONS: Record<string, string> = {
  'Romans:16':          'Written to the Romans from Corinthus, [and sent] by Phebe servant of the church at Cenchrea.',
  '1 Corinthians:16':   'The first [epistle] to the Corinthians was written from Philippi by Stephanas, and Fortunatus, and Achaicus, and Timotheus.',
  '2 Corinthians:13':   'The second [epistle] to the Corinthians was written from Philippi, [a city] of Macedonia, by Titus and Lucas.',
  'Galatians:6':        'Unto the Galatians written from Rome.',
  'Ephesians:6':        'Written from Rome unto the Ephesians by Tychicus.',
  'Philippians:4':      'It was written to the Philippians from Rome by Epaphroditus.',
  'Colossians:4':       'Written from Rome to the Colossians by Tychicus and Onesimus.',
  '1 Thessalonians:5':  'The first [epistle] unto the Thessalonians was written from Athens.',
  '2 Thessalonians:3':  'The second [epistle] to the Thessalonians was written from Athens.',
  '1 Timothy:6':        'The first to Timothy was written from Laodicea, which is the chiefest city of Phrygia Pacatiana.',
  '2 Timothy:4':        'The second [epistle] unto Timotheus, ordained the first bishop of the church of the Ephesians, was written from Rome, when Paul was brought before Nero the second time.',
  'Titus:3':            'It was written to Titus, ordained the first bishop of the church of the Cretians, from Nicopolis of Macedonia.',
  'Philemon:1':         'Written from Rome to Philemon, by Onesimus a servant.',
  'Hebrews:13':         'Written to the Hebrews from Italy by Timothy.',
};

// Full book-title text (upper-case, punctuation-stripped) → canonical book name.
const RTF_TITLE_MAP: Record<string, string> = {
  'THE FIRST BOOK OF MOSES': 'Genesis',
  'THE FIRST BOOK OF MOSES CALLED GENESIS': 'Genesis',
  'THE SECOND BOOK OF MOSES': 'Exodus',
  'THE SECOND BOOK OF MOSES CALLED EXODUS': 'Exodus',
  'THE THIRD BOOK OF MOSES': 'Leviticus',
  'THE THIRD BOOK OF MOSES CALLED LEVITICUS': 'Leviticus',
  'THE FOURTH BOOK OF MOSES': 'Numbers',
  'THE FOURTH BOOK OF MOSES CALLED NUMBERS': 'Numbers',
  'THE FIFTH BOOK OF MOSES': 'Deuteronomy',
  'THE FIFTH BOOK OF MOSES CALLED DEUTERONOMY': 'Deuteronomy',
  'THE BOOK OF JOSHUA': 'Joshua',
  'THE BOOK OF JUDGES': 'Judges',
  'THE BOOK OF RUTH': 'Ruth',
  'THE FIRST BOOK OF SAMUEL': '1 Samuel',
  'THE SECOND BOOK OF SAMUEL': '2 Samuel',
  'THE FIRST BOOK OF THE KINGS': '1 Kings',
  'THE SECOND BOOK OF THE KINGS': '2 Kings',
  'THE FIRST BOOK OF THE CHRONICLES': '1 Chronicles',
  'THE SECOND BOOK OF THE CHRONICLES': '2 Chronicles',
  'EZRA': 'Ezra',
  'THE BOOK OF NEHEMIAH': 'Nehemiah',
  'THE BOOK OF ESTHER': 'Esther',
  'THE BOOK OF JOB': 'Job',
  'THE BOOK OF PSALMS': 'Psalms',
  'BOOK OF PSALMS': 'Psalms',
  'THE PROVERBS': 'Proverbs',
  'ECCLESIASTES': 'Ecclesiastes',
  'ECCLESIASTES; OR THE PREACHER': 'Ecclesiastes',
  'THE SONG OF SOLOMON': 'Song of Solomon',
  'THE BOOK OF THE PROPHET ISAIAH': 'Isaiah',
  'THE BOOK OF THE PROPHET JEREMIAH': 'Jeremiah',
  'THE LAMENTATIONS OF JEREMIAH': 'Lamentations',
  'THE BOOK OF THE PROPHET EZEKIEL': 'Ezekiel',
  'THE BOOK OF DANIEL': 'Daniel',
  'HOSEA': 'Hosea', 'JOEL': 'Joel', 'AMOS': 'Amos', 'OBADIAH': 'Obadiah',
  'JONAH': 'Jonah', 'MICAH': 'Micah', 'NAHUM': 'Nahum', 'HABAKKUK': 'Habakkuk',
  'ZEPHANIAH': 'Zephaniah', 'HAGGAI': 'Haggai', 'ZECHARIAH': 'Zechariah', 'MALACHI': 'Malachi',
  'THE GOSPEL ACCORDING TO ST MATTHEW': 'Matthew',
  'THE GOSPEL ACCORDING TO ST MARK': 'Mark',
  'THE GOSPEL ACCORDING TO ST LUKE': 'Luke',
  'THE GOSPEL ACCORDING TO ST JOHN': 'John',
  'THE ACTS OF THE APOSTLES': 'Acts',
  'THE EPISTLE OF PAUL THE APOSTLE TO THE ROMANS': 'Romans',
  'THE FIRST EPISTLE OF PAUL THE APOSTLE TO THE CORINTHIANS': '1 Corinthians',
  'THE SECOND EPISTLE OF PAUL THE APOSTLE TO THE CORINTHIANS': '2 Corinthians',
  'THE EPISTLE OF PAUL THE APOSTLE TO THE GALATIANS': 'Galatians',
  'THE EPISTLE OF PAUL THE APOSTLE TO THE EPHESIANS': 'Ephesians',
  'THE EPISTLE OF PAUL THE APOSTLE TO THE PHILIPPIANS': 'Philippians',
  'THE EPISTLE OF PAUL THE APOSTLE TO THE COLOSSIANS': 'Colossians',
  'THE FIRST EPISTLE OF PAUL THE APOSTLE TO THE THESSALONIANS': '1 Thessalonians',
  'THE SECOND EPISTLE OF PAUL THE APOSTLE TO THE THESSALONIANS': '2 Thessalonians',
  'THE FIRST EPISTLE OF PAUL THE APOSTLE TO TIMOTHY': '1 Timothy',
  'THE SECOND EPISTLE OF PAUL THE APOSTLE TO TIMOTHY': '2 Timothy',
  'THE EPISTLE OF PAUL TO TITUS': 'Titus',
  'THE EPISTLE OF PAUL TO PHILEMON': 'Philemon',
  'THE EPISTLE OF PAUL THE APOSTLE TO THE HEBREWS': 'Hebrews',
  'THE GENERAL EPISTLE OF JAMES': 'James',
  'THE FIRST EPISTLE GENERAL OF PETER': '1 Peter',
  'THE SECOND EPISTLE GENERAL OF PETER': '2 Peter',
  'THE FIRST EPISTLE GENERAL OF JOHN': '1 John',
  'THE SECOND EPISTLE OF JOHN': '2 John',
  'THE THIRD EPISTLE OF JOHN': '3 John',
  'THE GENERAL EPISTLE OF JUDE': 'Jude',
  'THE REVELATION OF ST JOHN THE DIVINE': 'Revelation',
};
const TITLE_KEYS_BY_LEN = Object.keys(RTF_TITLE_MAP).sort((a, b) => b.length - a.length);

function normTitle(s: string): string {
  return s.replace(/[.,]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

function resolveBook(bufferLines: string[]): string | null {
  const joined = normTitle(bufferLines.join(' '));
  if (RTF_TITLE_MAP[joined]) return RTF_TITLE_MAP[joined];
  if (joined.includes('SAMUEL')) {
    if (/SECOND|\b2\b/.test(joined)) return '2 Samuel';
    if (/FIRST|\b1\b/.test(joined)) return '1 Samuel';
  }
  if (joined.includes('KINGS') && !joined.includes('SAMUEL')) {
    if (/SECOND|\b2\b/.test(joined)) return '2 Kings';
    if (/FIRST|\b1\b/.test(joined)) return '1 Kings';
  }
  for (const key of TITLE_KEYS_BY_LEN) {
    if (key.includes('SAMUEL') || key.includes('KINGS')) continue;
    if (joined.includes(key)) return RTF_TITLE_MAP[key];
  }
  return null;
}

const HEBREW_LETTERS = new Set([
  'ALEPH','BETH','GIMEL','DALETH','HE','VAU','ZAIN','CHETH','TETH','JOD',
  'CAPH','LAMED','MEM','NUN','SAMECH','AIN','PE','TZADDI','KOPH','RESH','SCHIN','TAU',
]);
function isHebrewLetterHeading(l: string): boolean {
  const t = l.trim().replace(/\.$/, '').toUpperCase();
  return HEBREW_LETTERS.has(t);
}

type VerseEntry = { verse: number; text: string; heading?: string };
type BibleData = Record<string, Record<number, VerseEntry[]>> & { __colophons?: Record<string, string> };

// Parses the raw PCE text file exactly like src/lib/biblePceParser.js —
// producing text with the source's original casing (incl. the ALL-CAPS
// opening word of verse 1), [brackets] for italics, and ¶ for paragraph marks.
export function parsePceText(text: string): BibleData {
  const data: BibleData = {};
  const normalizedText = text.replace(/\r\n?/g, '\n').replace(/\\\[/g, '[').replace(/\\\]/g, ']');
  const rawLines = normalizedText.split('\n');

  let currentBook: string | null = null;
  let currentChapter: number | null = null;
  let titleBuffer: string[] = [];
  let pendingFirstVerse = false;
  let pendingSuperscript = false;
  let pendingHeading: string | null = null;

  const isChapterLine = (l: string) => /^(CHAPTER|PSALM)\s+\d+$/i.test(l.trim());
  const isVerseLine = (l: string) => /^\d+\s/.test(l);

  const pushVerse = (vs: number, rawAfterNumber: string, hadParagraph: boolean) => {
    if (!currentBook || currentChapter == null) return;
    let t = rawAfterNumber.replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\s*<<[^>]*>>\s*$/, '').trim();
    if (/^[¶\u000F\u00B6]\s+/.test(t)) {
      t = '¶ ' + t.replace(/^[¶\u000F\u00B6]\s+/, '');
    } else if (hadParagraph) {
      t = '¶ ' + t;
    }
    if (currentBook === '1 John' && currentChapter === 2 && vs === 23) {
      t = t.replace('[(but)', '[but');
      t = t.replace('[[but]]', '[but]');
    }
    if (!data[currentBook][currentChapter]) data[currentBook][currentChapter] = [];
    const entry: VerseEntry = { verse: vs, text: t };
    if (pendingHeading) {
      entry.heading = pendingHeading;
      pendingHeading = null;
    }
    data[currentBook][currentChapter].push(entry);
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (isChapterLine(line)) {
      currentChapter = parseInt(trimmed.replace(/(CHAPTER|PSALM)\s+/i, ''), 10);
      if (currentBook && !data[currentBook][currentChapter]) data[currentBook][currentChapter] = [];
      pendingFirstVerse = true;
      pendingSuperscript = currentBook === 'Psalms' && !!SUBSCRIPTS[`Psalms:${currentChapter}`];
      titleBuffer = [];
      continue;
    }

    if (!trimmed) continue;

    if (currentBook === 'Psalms' && currentChapter === 119 && isHebrewLetterHeading(line)) {
      pendingHeading = trimmed.replace(/\.$/, '').toUpperCase();
      continue;
    }

    if (isVerseLine(line) && currentChapter != null) {
      const m = line.match(/^(\d+)(\s+)(.*)$/);
      if (m) {
        const vs = parseInt(m[1], 10);
        const hadParagraph = m[2].length >= 2 || /^[¶\u000F\u00B6]/.test(m[3]);
        pushVerse(vs, m[3], hadParagraph);
        pendingFirstVerse = false;
        continue;
      }
    }

    if (pendingSuperscript && currentChapter != null) {
      pendingSuperscript = false;
      continue;
    }

    if (pendingFirstVerse && currentChapter != null) {
      const hadParagraph = /^\s{2,}\S/.test(line) || /^[¶\u000F\u00B6]/.test(trimmed);
      pushVerse(1, trimmed, hadParagraph);
      pendingFirstVerse = false;
      continue;
    }

    if (currentBook && currentChapter == null) continue;

    titleBuffer.push(trimmed);
    const resolved = resolveBook(titleBuffer);
    if (resolved) {
      currentBook = resolved;
      currentChapter = null;
      if (!data[currentBook]) data[currentBook] = {};
      titleBuffer = [];
    } else if (titleBuffer.length > 4) {
      titleBuffer.shift();
    }
  }

  data.__colophons = { ...COLOPHONS };
  return data;
}

const PCE_TEXT_FILE_URL = 'https://base44.app/api/apps/6a713d810d97fdb5921ed14e/files/mp/public/6a713d810d97fdb5921ed14e/dabab1ba3_recovered-pce-bible.txt';

let cachedData: BibleData | null = null;

// Fetches and parses the PCE text file once per function isolate (in-memory cache).
export async function loadPceBible(): Promise<BibleData> {
  if (cachedData) return cachedData;
  const res = await fetch(PCE_TEXT_FILE_URL);
  if (!res.ok) throw new Error('Failed to fetch PCE Bible text: ' + res.status);
  const buf = await res.arrayBuffer();
  const text = new TextDecoder('windows-1252').decode(buf);
  cachedData = parsePceText(text);
  return cachedData;
}

// Flat list of every eligible (book, chapter, verse) in canonical book order.
// Excludes Romans 10 (structural exclusion), matching the site's behaviour.
export function buildFlatList(bible: BibleData) {
  const flat: { bookName: string; chapterNum: number; verseObj: VerseEntry }[] = [];
  for (const bn of BOOK_ORDER) {
    if (!bible[bn]) continue;
    for (const cn of Object.keys(bible[bn])) {
      const verses = bible[bn][Number(cn)];
      if (!verses || !verses.length) continue;
      for (const vo of verses) {
        if (bn === 'Romans' && parseInt(cn) === 10) continue;
        flat.push({ bookName: bn, chapterNum: parseInt(cn), verseObj: vo });
      }
    }
  }
  return flat;
}

function getAbbr(bookName: string): string {
  const entry = Object.entries(ABBR_TO_NAME).find(([, v]) => v === bookName);
  return entry ? entry[0] : bookName.slice(0, 3).toUpperCase();
}

// Builds the verse/superscription/heading fields for an API response. The
// verse text is returned exactly as parsed from the source file — no casing
// transformation is applied, since the PCE file already has the traditional
// ALL-CAPS opening word of every chapter's verse 1.
export function processVerse(vo: VerseEntry, context: { book: string; chapter: number }) {
  const result: { verse: number; text: string; heading?: string; superscription?: string } = {
    verse: vo.verse,
    text: vo.text,
  };
  if (vo.heading) result.heading = vo.heading;
  if (vo.verse === 1) {
    const sup = SUBSCRIPTS[`${context.book}:${context.chapter}`];
    if (sup) result.superscription = sup;
  }
  return result;
}

export function verseFromRef(bible: BibleData, ref: string) {
  const m = ref.match(/^(.*)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookName = m[1];
  const chapterNum = parseInt(m[2]);
  const verseNum = parseInt(m[3]);
  const verses = bible[bookName]?.[chapterNum];
  if (!verses) return null;
  const vo = verses.find(v => v.verse === verseNum);
  if (!vo) return null;
  const p = processVerse(vo, { book: bookName, chapter: chapterNum });
  const abbr = getAbbr(bookName);
  const result: any = {
    abbr, book: bookName, bookFullName: NAME_TO_FULL[bookName] || bookName,
    chapter: chapterNum, verse: verseNum, text: p.text, ref,
  };
  if (p.heading) result.heading = p.heading;
  if (p.superscription) result.superscription = p.superscription;
  const colophon = bible.__colophons?.[`${bookName}:${chapterNum}`];
  if (colophon) result.colophon = colophon;
  return result;
}

export function normalizeDateKey(key: any) {
  if (!key) return key;
  const parts = String(key).split('-');
  if (parts.length !== 3) return key;
  const [y, m, d] = parts;
  return `${y}-${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
}