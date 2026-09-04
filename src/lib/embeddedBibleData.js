// Complete King James Bible embedded data - parsed once at build time
// This data is used for offline-first access with no network requests

const ABBR_TO_NAME = {
  'Ge':'Genesis','Ex':'Exodus','Le':'Leviticus','Nu':'Numbers','De':'Deuteronomy',
  'Jos':'Joshua','Jud':'Judges','Ru':'Ruth','1Sa':'1 Samuel','2Sa':'2 Samuel',
  '1Ki':'1 Kings','2Ki':'2 Kings','1Ch':'1 Chronicles','2Ch':'2 Chronicles',
  'Ezr':'Ezra','Ne':'Nehemiah','Es':'Esther','Job':'Job','Ps':'Psalms','Pr':'Proverbs',
  'Ec':'Ecclesiastes','So':'Song of Solomon','Isa':'Isaiah','Jer':'Jeremiah',
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

// Placeholder - in production, this would be the complete parsed Bible text
// Fetched from https://media.base44.com/files/public/6a05adcee684459ea05d28a4/ee659445e_TEXT-PCE-127.txt
// For now, returns the raw text format for parsing
export const EMBEDDED_BIBLE_TEXT = `Ge 1:1 In the beginning God created the heaven and the earth.
Ge 1:2 And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.
Ge 1:3 And God said, Let there be light: and there was light.
Ge 1:4 And God saw the light, that it was good: and God divided the light from the darkness.
Ge 1:5 And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.
Ge 1:6 And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.
Ge 1:7 And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.
Ge 1:8 And God called the firmament Heaven. And the evening and the morning were the second day.
Ge 1:9 And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.
Ge 1:10 And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good.
Ge 1:11 And God said, Let the earth bring forth grass, the herb yielding seed, and the fruit tree yielding fruit after his kind, whose seed is in itself, upon the earth: and it was so.
Ge 1:12 And the earth brought forth grass, and herb yielding seed after his kind, and the tree yielding fruit, whose seed was in itself, after his kind: and God saw that it was good.
Ge 1:13 And the evening and the morning were the third day.
Ge 1:14 And God said, Let there be lights in the firmament of the heaven to divide the day from the night; and let them be for signs, and for seasons, and for days, and years:
Ge 1:15 And let them be for lights in the firmament of the heaven to give light upon the earth: and it was so.
Ge 1:16 And God made two great lights; the greater light to rule the day, and the lesser light to rule the night: he made the stars also.
Ge 1:17 And God set them in the firmament of the heaven to give light upon the earth,
Ge 1:18 And to rule over the day and over the night, and to divide the light from the darkness: and God saw that it was good.
Ge 1:19 And the evening and the morning were the fourth day.
Ge 1:20 And God said, Let the waters bring forth abundantly the moving creature that hath life, and fowl that may fly above the earth in the open firmament of heaven.
Ge 1:21 And God created great whales, and every living creature that moveth, which the waters brought forth abundantly, after their kind, and every winged fowl after his kind: and God saw that it was good.
Ge 1:22 And God blessed them, saying, Be fruitful, and multiply, and fill the waters in the seas, and let fowl multiply in the earth.
Ge 1:23 And the evening and the morning were the fifth day.
Ge 1:24 And God said, Let the earth bring forth the living creature after his kind, cattle, and creeping thing, and beast of the earth after his kind: and it was so.
Ge 1:25 And God made the beast of the earth after his kind, and cattle after their kind, and every thing that creepeth upon the earth after his kind: and God saw that it was good.
Ge 1:26 And God said, Let us make man in our image, after our likeness: and let them have dominion over the fish of the sea, and over the fowl of the air, and over the cattle, and over all the earth, and over every creeping thing that creepeth upon the earth.
Ge 1:27 So God created man in his own image, in the image of God created he him; male and female created he them.
Ge 1:28 And God blessed them, and God said unto them, Be fruitful, and multiply, and replenish the earth, and subdue it: and have dominion over the fish of the sea, and over the fowl of the air, and over every living thing that moveth upon the earth.`;

export function parseEmbeddedBible(text) {
  const data = {};
  const colophons = {};
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

    const colophonMatch = verseText.match(/<<\[([^\]]+)\]>>$/);
    if (colophonMatch) {
      const colophonKey = `${bookName}:${chapter}`;
      if (!colophons[colophonKey]) {
        colophons[colophonKey] = `[${colophonMatch[1]}]`;
      }
      verseText = verseText.replace(/\s*<<\[[^\]]+\]>>$/, '');
    }

    if (!verseText.trim()) continue;

    if (!data[bookName]) data[bookName] = {};
    if (!data[bookName][chapter]) data[bookName][chapter] = [];
    data[bookName][chapter].push({ verse, text: verseText });
  }

  data.__colophons = colophons;
  return data;
}