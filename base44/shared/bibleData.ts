// Shared Bible data loading and verse lookup logic for backend functions.
// Used by bibleApi, shareCard, and any other function that needs access to
// the KJB (Pure Cambridge Edition) text.
//
// This is a plain module — no Deno.serve. Import from functions via:
//   import { loadBible, verseFromRef, ... } from "../../shared/bibleData.ts";

export const ABBR_TO_NAME = {
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

// Full title-page book names (as printed in the KJB Table of Contents).
// Maps the short API name → the full descriptive title.
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

// Psalm superscriptions (titles above verse 1). The Wharton PCE source text
// does not encode these, so they're hardcoded here — matching the frontend's
// bibleSubscripts.js. Key: "Psalms:chapter". Psalms without a superscription
// are not listed (e.g. Psalms 1, 2, 10, 33, 43, 71).
export const PSALM_SUPERSCRIPTIONS: Record<string, string> = {
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

// Hardcoded, authoritative verse-1 text for Psalms whose printed superscription
// is not part of verse 1 itself. The Read page (frontend) force-overrides verse 1
// with this exact plain-case text for these chapters — so the API must match it
// here instead of applying the chapter-opening caps convention below.
export const PSALM_VERSE_1: Record<number, string> = {
  3: 'LORD, how are they increased that trouble me! many [are] they that rise up against me.',
  4: 'HEAR me when I call, O God of my righteousness: thou hast enlarged me [when] [I] [was] in distress; have mercy upon me, and hear my prayer.',
  5: 'GIVE ear to my words, O LORD, consider my meditation.',
  6: 'O LORD, rebuke me not in thine anger, neither chasten me in thy hot displeasure.',
  7: 'O LORD my God, in thee do I put my trust: save me from all them that persecute me, and deliver me:',
  8: 'O LORD our Lord, how excellent [is] thy name in all the earth! who hast set thy glory above the heavens.',
  9: 'I WILL praise [thee], O LORD, with my whole heart; I will shew forth all thy marvellous works.',
  11: 'IN the LORD put I my trust: how say ye to my soul, Flee [as] a bird to your mountain?',
  12: 'HELP, LORD; for the godly man ceaseth; for the faithful fail from among the children of men.',
  13: 'HOW long wilt thou forget me, O LORD? for ever? how long wilt thou hide thy face from me?',
  14: 'THE fool hath said in his heart, [There] [is] no God. They are corrupt, they have done abominable works, [there] [is] none that doeth good.',
  15: 'LORD, who shall abide in thy tabernacle? who shall dwell in thy holy hill?',
  16: 'PRESERVE me, O God: for in thee do I put my trust.',
  17: 'HEAR the right, O LORD, attend unto my cry, give ear unto my prayer, [that] [goeth] not out of feigned lips.',
  18: 'I WILL love thee, O LORD, my strength.',
  19: 'THE heavens declare the glory of God; and the firmament sheweth his handywork.',
  20: 'THE LORD hear thee in the day of trouble; the name of the God of Jacob defend thee;',
  21: 'THE king shall joy in thy strength, O LORD; and in thy salvation how greatly shall he rejoice!',
  22: 'MY God, my God, why hast thou forsaken me? [why] [art] [thou] [so] far from helping me, [and] [from] the words of my roaring?',
  23: 'THE LORD [is] my shepherd; I shall not want.',
  24: 'THE earth [is] the LORD\'s, and the fulness thereof; the world, and they that dwell therein.',
  25: 'UNTO thee, O LORD, do I lift up my soul.',
  26: 'JUDGE me, O LORD; for I have walked in mine integrity: I have trusted also in the LORD; [therefore] I shall not slide.',
  27: 'THE LORD [is] my light and my salvation; whom shall I fear? the LORD [is] the strength of my life; of whom shall I be afraid?',
  28: 'UNTO thee will I cry, O LORD my rock; be not silent to me: lest, [if] thou be silent to me, I become like them that go down into the pit.',
  29: 'GIVE unto the LORD, O ye mighty, give unto the LORD glory and strength.',
  30: 'I WILL extol thee, O LORD; for thou hast lifted me up, and hast not made my foes to rejoice over me.',
  31: 'IN thee, O LORD, do I put my trust; let me never be ashamed: deliver me in thy righteousness.',
  32: 'BLESSED [is] [he] [whose] transgression [is] forgiven, [whose] sin [is] covered.',
  34: 'I WILL bless the LORD at all times: his praise [shall] continually [be] in my mouth.',
  35: 'PLEAD [my] [cause], O LORD, with them that strive with me: fight against them that fight against me.',
  36: 'THE transgression of the wicked saith within my heart, [that] [there] [is] no fear of God before his eyes.',
  37: 'FRET not thyself because of evildoers, neither be thou envious against the workers of iniquity.',
  38: 'O LORD, rebuke me not in thy wrath: neither chasten me in thy hot displeasure.',
  39: 'I SAID, I will take heed to my ways, that I sin not with my tongue: I will keep my mouth with a bridle, while the wicked is before me.',
  40: 'I WAITED patiently for the LORD; and he inclined unto me, and heard my cry.',
  41: 'BLESSED [is] he that considereth the poor: the LORD will deliver him in time of trouble.',
  42: 'AS the hart panteth after the water brooks, so panteth my soul after thee, O God.',
  44: 'WE have heard with our ears, O God, our fathers have told us, [what] work thou didst in their days, in the times of old.',
  45: 'MY heart is inditing a good matter: I speak of the things which I have made touching the king: my tongue [is] the pen of a ready writer.',
  46: 'GOD [is] our refuge and strength, a very present help in trouble.',
  47: 'O CLAP your hands, all ye people; shout unto God with the voice of triumph.',
  48: 'GREAT [is] the LORD, and greatly to be praised in the city of our God, [in] the mountain of his holiness.',
  49: 'HEAR this, all [ye] people; give ear, all [ye] inhabitants of the world:',
  50: 'THE mighty God, [even] the LORD, hath spoken, and called the earth from the rising of the sun unto the going down thereof.',
  51: 'HAVE mercy upon me, O God, according to thy lovingkindness: according unto the multitude of thy tender mercies blot out my transgressions.',
  52: 'WHY boastest thou thyself in mischief, O mighty man? the goodness of God [endureth] continually.',
  53: 'THE fool hath said in his heart, [There] [is] no God. Corrupt are they, and have done abominable iniquity: [there] [is] none that doeth good.',
  54: 'SAVE me, O God, by thy name, and judge me by thy strength.',
  55: 'GIVE ear to my prayer, O God; and hide not thyself from my supplication.',
  56: 'BE merciful unto me, O God: for man would swallow me up; he fighting daily oppresseth me.',
  57: 'BE merciful unto me, O God, be merciful unto me: for my soul trusteth in thee: yea, in the shadow of thy wings will I make my refuge, until [these] calamities be overpast.',
  58: 'DO ye indeed speak righteousness, O congregation? do ye judge uprightly, O ye sons of men?',
  59: 'DELIVER me from mine enemies, O my God: defend me from them that rise up against me.',
  60: 'O GOD, thou hast cast us off, thou hast scattered us, thou hast been displeased; O turn thyself to us again.',
  61: 'HEAR my cry, O God; attend unto my prayer.',
  62: 'TRULY my soul waiteth upon God: from him [cometh] my salvation.',
  63: 'O GOD, thou [art] my God; early will I seek thee: my soul thirsteth for thee, my flesh longeth for thee in a dry and thirsty land, where no water is;',
  64: 'HEAR my voice, O God, in my prayer: preserve my life from fear of the enemy.',
  65: 'PRAISE waiteth for thee, O God, in Sion: and unto thee shall the vow be performed.',
  66: 'MAKE a joyful noise unto God, all ye lands:',
  67: 'GOD be merciful unto us, and bless us; [and] cause his face to shine upon us; Selah.',
  68: 'LET God arise, let his enemies be scattered: let them also that hate him flee before him.',
  69: 'SAVE me, O God; for the waters are come in unto [my] soul.',
  70: '[MAKE] [haste], O God, to deliver me; make haste to help me, O LORD.',
  72: 'GIVE the king thy judgments, O God, and thy righteousness unto the king\'s son.',
  73: 'TRULY God [is] good to Israel, [even] to such as are of a clean heart.',
  74: 'O GOD, why hast thou cast [us] off for ever? [why] doth thine anger smoke against the sheep of thy pasture?',
  75: 'UNTO thee, O God, do we give thanks, [unto] [thee] do we give thanks: for [that] thy name is near thy wondrous works declare.',
  76: 'IN Judah [is] God known: his name [is] great in Israel.',
  77: 'I CRIED unto God with my voice, [even] unto God with my voice; and he gave ear unto me.',
  78: 'GIVE ear, O my people, [to] my law: incline your ears to the words of my mouth.',
  79: 'O GOD, the heathen are come into thine inheritance; thy holy temple have they defiled; they have laid Jerusalem on heaps.',
  80: 'GIVE ear, O Shepherd of Israel, thou that leadest Joseph like a flock; thou that dwellest [between] the cherubims, shine forth.',
  81: 'SING aloud unto God our strength: make a joyful noise unto the God of Jacob.',
  82: 'GOD standeth in the congregation of the mighty; he judgeth among the gods.',
  83: 'KEEP not thou silence, O God: hold not thy peace, and be not still, O God.',
  84: 'HOW amiable [are] thy tabernacles, O LORD of hosts!',
  85: 'LORD, thou hast been favourable unto thy land: thou hast brought back the captivity of Jacob.',
  86: 'BOW down thine ear, O LORD, hear me: for I [am] poor and needy.',
  87: 'HIS foundation [is] in the holy mountains.',
  88: 'O LORD God of my salvation, I have cried day [and] night before thee:',
  89: 'I WILL sing of the mercies of the LORD for ever: with my mouth will I make known thy faithfulness to all generations.',
  90: 'LORD, thou hast been our dwelling place in all generations.',
  92: '[IT] [is] [a] good [thing] to give thanks unto the LORD, and to sing praises unto thy name, O most High:',
  98: 'O SING unto the LORD a new song; for he hath done marvellous things: his right hand, and his holy arm, hath gotten him the victory.',
  100: 'MAKE a joyful noise unto the LORD, all ye lands.',
  101: 'I WILL sing of mercy and judgment: unto thee, O LORD, will I sing.',
  102: 'HEAR my prayer, O LORD, and let my cry come unto thee.',
  103: 'BLESS the LORD, O my soul: and all that is within me, [bless] his holy name.',
  108: 'O GOD, my heart is fixed; I will sing and give praise, even with my glory.',
  109: 'HOLD not thy peace, O God of my praise;',
  110: 'THE LORD said unto my Lord, Sit thou at my right hand, until I make thine enemies thy footstool.',
  120: 'IN my distress I cried unto the LORD, and he heard me.',
  121: 'I WILL lift up mine eyes unto the hills, from whence cometh my help.',
  122: 'I WAS glad when they said unto me, Let us go into the house of the LORD.',
  123: 'UNTO thee lift I up mine eyes, O thou that dwellest in the heavens.',
  124: 'IF [it] [had] not [been] the LORD who was on our side, now may Israel say;',
  125: 'THEY that trust in the LORD [shall] [be] as mount Zion, [which] cannot be removed, [but] abideth for ever.',
  126: 'WHEN the LORD turned again the captivity of Zion, we were like them that dream.',
  127: 'EXCEPT the LORD build the house, they labour in vain that build it: except the LORD keep the city, the watchman waketh [but] in vain.',
  128: 'BLESSED [is] every one that feareth the LORD; that walketh in his ways.',
  129: 'MANY a time have they afflicted me from my youth, may Israel now say:',
  130: 'OUT of the depths have I cried unto thee, O LORD.',
  131: 'LORD, my heart is not haughty, nor mine eyes lofty: neither do I exercise myself in great matters, or in things too high for me.',
  132: 'LORD, remember David, [and] all his afflictions:',
  133: 'BEHOLD, how good and how pleasant [it] [is] for brethren to dwell together in unity!',
  134: 'BEHOLD, bless ye the LORD, all [ye] servants of the LORD, which by night stand in the house of the LORD.',
  138: 'I WILL praise thee with my whole heart: before the gods will I sing praise unto thee.',
  139: 'O LORD, thou hast searched me, and known [me].',
  140: 'DELIVER me, O LORD, from the evil man: preserve me from the violent man;',
  141: 'LORD, I cry unto thee: make haste unto me; give ear unto my voice, when I cry unto thee.',
  142: 'I CRIED unto the LORD with my voice; with my voice unto the LORD did I make my supplication.',
  143: 'HEAR my prayer, O LORD, give ear to my supplications: in thy faithfulness answer me, [and] in thy righteousness.',
  144: 'BLESSED [be] the LORD my strength, which teacheth my hands to war, [and] my fingers to fight:',
  145: 'I WILL extol thee, my God, O king; and I will bless thy name for ever and ever.',
};

export const TEXT_URL = 'https://media.base44.com/files/public/6a05d76723afe58d80c589e8/91ec9491e_WHARTON_PCE.txt';

// In-memory cache (per-function isolate). Keyed without colophons so all
// callers share the same cached object.
let bibleData = null;

// Fetch Bible text from remote source once on startup, cache it.
// Includes colophon extraction (stored as bible.__colophons) so bibleApi
// can serve them; other callers simply ignore the extra property.
export async function loadBible() {
  if (bibleData) return bibleData;

  const res = await fetch(TEXT_URL);
  if (!res.ok) throw new Error('Failed to fetch Bible text');
  const text = await res.text();

  const data = {};
  const colophons = {};
  const lines = text.split('\n');

  // Psalm 119 acrostic: the Wharton format has standalone "Ps ALEPH.", "Ps BETH."
  // etc. lines before each 8-verse stanza. We capture the heading and stamp it
  // onto the next verse parsed, so the API can return it like the frontend does.
  const HEBREW_LETTERS = new Set([
    'ALEPH','BETH','GIMEL','DALETH','HE','VAU','ZAIN','CHETH','TETH','JOD',
    'CAPH','LAMED','MEM','NUN','SAMECH','AIN','PE','TZADDI','KOPH','RESH','SCHIN','TAU',
  ]);
  let pendingHeading: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) continue;
    const abbr = trimmed.slice(0, spaceIdx);
    const rest = trimmed.slice(spaceIdx + 1);

    // Psalm 119 Hebrew letter acrostic heading: "Ps ALEPH." etc.
    if (abbr === 'Ps') {
      const letterMatch = rest.match(/^([A-Z]+)\.$/);
      if (letterMatch && HEBREW_LETTERS.has(letterMatch[1])) {
        pendingHeading = letterMatch[1];
        continue;
      }
    }

    // Standalone colophon (epistle subscription) line: "<abbr> ¶ [text]"
    const colophonLineMatch = rest.match(/^\ufffd\s*\[(.*)\]\s*$/);
    if (colophonLineMatch) {
      const cBook = ABBR_TO_NAME[abbr];
      if (cBook && data[cBook]) {
        const chs = Object.keys(data[cBook]).map(Number).filter(n => !isNaN(n));
        if (chs.length) {
          const lastCh = Math.max(...chs);
          colophons[`${cBook}:${lastCh}`] = colophonLineMatch[1];
        }
      }
      continue;
    }

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

    // Extract colophon markers: ¶ [text] at end of verse
    const colophonMatch = verseText.match(/¶\s*\[(.*?)\]\s*$/);
    if (colophonMatch) {
      const colophonKey = `${bookName}:${chapter}`;
      if (!colophons[colophonKey]) {
        colophons[colophonKey] = colophonMatch[1];
      }
      verseText = verseText.replace(/\s*¶\s*\[.*?\]\s*$/, '').trim();
    }

    if (!verseText.trim()) continue;

    // Fix 1 John 2:23 PCE syntax
    if (bookName === '1 John' && chapter === 2 && verse === 23) {
      verseText = verseText.replace('[(but)', '[but');
      verseText = verseText.replace('[[but]]', '[but]');
    }

    if (!data[bookName]) data[bookName] = {};
    if (!data[bookName][chapter]) data[bookName][chapter] = [];
    const entry: { verse: number; text: string; heading?: string } = { verse, text: verseText };
    if (pendingHeading) {
      entry.heading = pendingHeading;
      pendingHeading = null;
    }
    data[bookName][chapter].push(entry);
  }

  bibleData = data;
  bibleData.__colophons = colophons;
  return data;
}

// Build the flat verse list (all eligible verses in biblical book order).
// Excludes Romans 10 (structural exclusion). DB exclusions are applied
// separately in pickForSeed, so the list length stays stable.
export function buildFlatList(bible) {
  const flat = [];
  for (const bn of BOOK_ORDER) {
    if (!bible[bn]) continue;
    const chapters = Object.keys(bible[bn]);
    for (const cn of chapters) {
      const verses = bible[bn][cn];
      if (!verses || !verses.length) continue;
      for (const vo of verses) {
        const isExcludedChapter = bn === 'Romans' && parseInt(cn) === 10;
        if (isExcludedChapter) continue;
        flat.push({ bookName: bn, chapterNum: cn, verseObj: vo });
      }
    }
  }
  return flat;
}

// Convert raw \uFFFD characters to proper glyphs: apostrophes after letters,
// pilcrows (¶) everywhere else. This matches the frontend's cleanVerseText logic.
export function normalizePilcrows(text: string): string {
  return String(text)
    .replace(/(\p{L})\uFFFD/gu, "$1'")
    .replace(/\uFFFD/g, '¶');
}

// Chapter openings are traditionally set with the whole first word in caps
// (and the second word too, if the first word is only one letter, e.g.
// "I SAY" or "O ISRAEL") to fill the visual space of a printed drop cap.
// The Wharton PCE source used here is plain sentence case, so we re-apply
// that convention to verse 1 of every chapter.
export function capitalizeChapterOpening(text: string): string {
  const wordRe = /[A-Za-z']+/;
  const m = text.match(wordRe);
  if (!m) return text;
  const firstWord = m[0];
  const endIdx = m.index! + firstWord.length;
  let result = text.slice(0, m.index) + firstWord.toUpperCase() + text.slice(endIdx);
  if (firstWord.length === 1) {
    const rest = result.slice(endIdx);
    const m2 = rest.match(wordRe);
    if (m2) {
      const idx2 = endIdx + m2.index!;
      const endIdx2 = idx2 + m2[0].length;
      result = result.slice(0, idx2) + m2[0].toUpperCase() + result.slice(endIdx2);
    }
  }
  return result;
}

// Extract a superscription (Psalm title) from <<text>> markers at the start
// of a verse. Returns the cleaned text and the superscription separately.
export function extractSuperscription(rawText: string): { text: string; superscription?: string } {
  const match = rawText.match(/^<<(.+?)>>\s*/);
  if (match) {
    return {
      text: rawText.replace(/^<<.+?>>\s*/, ''),
      superscription: match[1],
    };
  }
  return { text: rawText };
}

// Process a raw verse object from the bible data: extract superscription,
// normalize pilcrows, and preserve heading. Brackets ([italics]) are kept.
export function processVerse(vo: { verse: number; text: string; heading?: string }, context?: { book: string; chapter: number }):
  { verse: number; text: string; heading?: string; superscription?: string } {
  const { text: textNoSup, superscription } = extractSuperscription(vo.text);
  let text = normalizePilcrows(textNoSup);
  if (vo.verse === 1) {
    const psalmOverride = context?.book === 'Psalms' ? PSALM_VERSE_1[context.chapter] : null;
    text = psalmOverride || capitalizeChapterOpening(text);
  }
  const result: { verse: number; text: string; heading?: string; superscription?: string } =
    { verse: vo.verse, text };
  if (vo.heading) result.heading = vo.heading;
  if (superscription) result.superscription = superscription;
  // Psalm superscriptions are not in the Wharton PCE source text — look them
  // up from the hardcoded map and attach to verse 1 of each Psalm.
  if (!result.superscription && context && vo.verse === 1) {
    const psSup = PSALM_SUPERSCRIPTIONS[`${context.book}:${context.chapter}`];
    if (psSup) result.superscription = psSup;
  }
  return result;
}

// Resolve a "book chapter:verse" ref into a verse payload from the loaded bible.
// Includes superscription (if any), colophon (if any), normalized pilcrows (¶),
// and keeps [brackets] for italic words.
export function verseFromRef(bible, ref) {
  const m = ref.match(/^(.*)\s+(\d+):(\d+)$/);
  if (!m) return null;
  const bookName = m[1];
  const chapterNum = m[2];
  const verseNum = parseInt(m[3]);
  const verses = bible[bookName]?.[chapterNum];
  if (!verses) return null;
  const vo = verses.find(v => v.verse === verseNum);
  if (!vo) return null;
  const { text: textNoSup, superscription } = extractSuperscription(vo.text);
  let text = normalizePilcrows(textNoSup);
  if (verseNum === 1) {
    const psalmOverride = bookName === 'Psalms' ? PSALM_VERSE_1[parseInt(chapterNum)] : null;
    text = psalmOverride || capitalizeChapterOpening(text);
  }
  const abbrEntry = Object.entries(ABBR_TO_NAME).find(([k, v]) => v === bookName);
  const abbr = abbrEntry ? abbrEntry[0] : bookName.slice(0, 3).toUpperCase();
  const result: any = { abbr, book: bookName, bookFullName: NAME_TO_FULL[bookName] || bookName, chapter: parseInt(chapterNum), verse: verseNum, text, ref };
  if (vo.heading) result.heading = vo.heading;
  if (superscription) result.superscription = superscription;
  // Psalm superscriptions are not in the Wharton PCE source text — look them
  // up from the hardcoded map and attach to verse 1 of each Psalm.
  if (!result.superscription && verseNum === 1) {
    const psSup = PSALM_SUPERSCRIPTIONS[`${bookName}:${chapterNum}`];
    if (psSup) result.superscription = psSup;
  }
  const colophon = bible.__colophons?.[`${bookName}:${chapterNum}`];
  if (colophon) result.colophon = normalizePilcrows(colophon);
  return result;
}

// Normalize a date key to zero-padded YYYY-MM-DD.
export function normalizeDateKey(key) {
  if (!key) return key;
  const parts = String(key).split('-');
  if (parts.length !== 3) return key;
  const [y, m, d] = parts;
  return `${y}-${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
}