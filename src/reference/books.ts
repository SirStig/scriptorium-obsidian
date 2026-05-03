import type { BookRecord } from "./types";
import { syncFuzzyBooks } from "./fuzzy";

const CHAPTER_COUNTS_OT = [
	50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4,
] as const;

const CHAPTER_COUNTS_NT = [
	28, 16, 24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
] as const;

export const PROTESTANT_BOOKS: BookRecord[] = [
	{ osis: "Gen", name: "Genesis", aliases: ["ge", "gn"], chapters: CHAPTER_COUNTS_OT[0] },
	{ osis: "Exod", name: "Exodus", aliases: ["ex", "exo"], chapters: CHAPTER_COUNTS_OT[1] },
	{ osis: "Lev", name: "Leviticus", aliases: ["le", "lv"], chapters: CHAPTER_COUNTS_OT[2] },
	{ osis: "Num", name: "Numbers", aliases: ["nu", "nm", "nb"], chapters: CHAPTER_COUNTS_OT[3] },
	{ osis: "Deut", name: "Deuteronomy", aliases: ["de", "dt"], chapters: CHAPTER_COUNTS_OT[4] },
	{ osis: "Josh", name: "Joshua", aliases: ["jos"], chapters: CHAPTER_COUNTS_OT[5] },
	{ osis: "Judg", name: "Judges", aliases: ["jg", "jdg", "jdgs"], chapters: CHAPTER_COUNTS_OT[6] },
	{ osis: "Ruth", name: "Ruth", aliases: ["ru"], chapters: CHAPTER_COUNTS_OT[7] },
	{ osis: "1Sam", name: "1 Samuel", aliases: ["1 sa", "1sam", "i samuel", "first samuel"], chapters: CHAPTER_COUNTS_OT[8] },
	{ osis: "2Sam", name: "2 Samuel", aliases: ["2 sa", "2sam", "ii samuel", "second samuel"], chapters: CHAPTER_COUNTS_OT[9] },
	{ osis: "1Kgs", name: "1 Kings", aliases: ["1 ki", "1kgs", "i kings", "first kings"], chapters: CHAPTER_COUNTS_OT[10] },
	{ osis: "2Kgs", name: "2 Kings", aliases: ["2 ki", "2kgs", "ii kings", "second kings"], chapters: CHAPTER_COUNTS_OT[11] },
	{ osis: "1Chr", name: "1 Chronicles", aliases: ["1 ch", "1chr", "i chronicles"], chapters: CHAPTER_COUNTS_OT[12] },
	{ osis: "2Chr", name: "2 Chronicles", aliases: ["2 ch", "2chr", "ii chronicles"], chapters: CHAPTER_COUNTS_OT[13] },
	{ osis: "Ezra", name: "Ezra", aliases: ["ezr"], chapters: CHAPTER_COUNTS_OT[14] },
	{ osis: "Neh", name: "Nehemiah", aliases: ["ne"], chapters: CHAPTER_COUNTS_OT[15] },
	{ osis: "Esth", name: "Esther", aliases: ["es", "est"], chapters: CHAPTER_COUNTS_OT[16] },
	{ osis: "Job", name: "Job", aliases: ["jb"], chapters: CHAPTER_COUNTS_OT[17] },
	{ osis: "Ps", name: "Psalms", aliases: ["ps", "psalm", "pss", "psa"], chapters: CHAPTER_COUNTS_OT[18] },
	{ osis: "Prov", name: "Proverbs", aliases: ["pr", "pv", "pro"], chapters: CHAPTER_COUNTS_OT[19] },
	{ osis: "Eccl", name: "Ecclesiastes", aliases: ["ec", "ecc", "qoheleth"], chapters: CHAPTER_COUNTS_OT[20] },
	{ osis: "Song", name: "Song of Solomon", aliases: ["song of songs", "sos", "canticles", "cant"], chapters: CHAPTER_COUNTS_OT[21] },
	{ osis: "Isa", name: "Isaiah", aliases: ["is"], chapters: CHAPTER_COUNTS_OT[22] },
	{ osis: "Jer", name: "Jeremiah", aliases: ["je", "jr"], chapters: CHAPTER_COUNTS_OT[23] },
	{ osis: "Lam", name: "Lamentations", aliases: ["la"], chapters: CHAPTER_COUNTS_OT[24] },
	{ osis: "Ezek", name: "Ezekiel", aliases: ["eze", "ezk"], chapters: CHAPTER_COUNTS_OT[25] },
	{ osis: "Dan", name: "Daniel", aliases: ["da", "dn"], chapters: CHAPTER_COUNTS_OT[26] },
	{ osis: "Hos", name: "Hosea", aliases: ["ho", "hs"], chapters: CHAPTER_COUNTS_OT[27] },
	{ osis: "Joel", name: "Joel", aliases: ["jl"], chapters: CHAPTER_COUNTS_OT[28] },
	{ osis: "Amos", name: "Amos", aliases: ["am"], chapters: CHAPTER_COUNTS_OT[29] },
	{ osis: "Obad", name: "Obadiah", aliases: ["ob"], chapters: CHAPTER_COUNTS_OT[30] },
	{ osis: "Jonah", name: "Jonah", aliases: ["jon"], chapters: CHAPTER_COUNTS_OT[31] },
	{ osis: "Mic", name: "Micah", aliases: ["mc"], chapters: CHAPTER_COUNTS_OT[32] },
	{ osis: "Nah", name: "Nahum", aliases: ["na"], chapters: CHAPTER_COUNTS_OT[33] },
	{ osis: "Hab", name: "Habakkuk", aliases: ["hb"], chapters: CHAPTER_COUNTS_OT[34] },
	{ osis: "Zeph", name: "Zephaniah", aliases: ["zep", "zp"], chapters: CHAPTER_COUNTS_OT[35] },
	{ osis: "Hag", name: "Haggai", aliases: ["hg"], chapters: CHAPTER_COUNTS_OT[36] },
	{ osis: "Zech", name: "Zechariah", aliases: ["zec", "zc"], chapters: CHAPTER_COUNTS_OT[37] },
	{ osis: "Mal", name: "Malachi", aliases: ["ml"], chapters: CHAPTER_COUNTS_OT[38] },
	{ osis: "Matt", name: "Matthew", aliases: ["mat", "mt"], chapters: CHAPTER_COUNTS_NT[0] },
	{ osis: "Mark", name: "Mark", aliases: ["mk", "mr", "mrk"], chapters: CHAPTER_COUNTS_NT[1] },
	{ osis: "Luke", name: "Luke", aliases: ["lk", "lu"], chapters: CHAPTER_COUNTS_NT[2] },
	{ osis: "John", name: "John", aliases: ["jn", "joh"], chapters: CHAPTER_COUNTS_NT[3] },
	{ osis: "Acts", name: "Acts", aliases: ["ac"], chapters: CHAPTER_COUNTS_NT[4] },
	{ osis: "Rom", name: "Romans", aliases: ["ro", "rm", "rom"], chapters: CHAPTER_COUNTS_NT[5] },
	{ osis: "1Cor", name: "1 Corinthians", aliases: ["1 co", "1cor", "1 cor", "i corinthians"], chapters: CHAPTER_COUNTS_NT[6] },
	{ osis: "2Cor", name: "2 Corinthians", aliases: ["2 co", "2cor", "ii corinthians"], chapters: CHAPTER_COUNTS_NT[7] },
	{ osis: "Gal", name: "Galatians", aliases: ["ga"], chapters: CHAPTER_COUNTS_NT[8] },
	{ osis: "Eph", name: "Ephesians", aliases: ["ep"], chapters: CHAPTER_COUNTS_NT[9] },
	{ osis: "Phil", name: "Philippians", aliases: ["php", "pp"], chapters: CHAPTER_COUNTS_NT[10] },
	{ osis: "Col", name: "Colossians", aliases: ["co"], chapters: CHAPTER_COUNTS_NT[11] },
	{ osis: "1Thess", name: "1 Thessalonians", aliases: ["1 th", "1thess", "i thessalonians"], chapters: CHAPTER_COUNTS_NT[12] },
	{ osis: "2Thess", name: "2 Thessalonians", aliases: ["2 th", "2thess"], chapters: CHAPTER_COUNTS_NT[13] },
	{ osis: "1Tim", name: "1 Timothy", aliases: ["1 ti", "1tim", "i timothy"], chapters: CHAPTER_COUNTS_NT[14] },
	{ osis: "2Tim", name: "2 Timothy", aliases: ["2 ti", "2tim"], chapters: CHAPTER_COUNTS_NT[15] },
	{ osis: "Titus", name: "Titus", aliases: ["tit", "ti"], chapters: CHAPTER_COUNTS_NT[16] },
	{ osis: "Phlm", name: "Philemon", aliases: ["phm", "philem"], chapters: CHAPTER_COUNTS_NT[17] },
	{ osis: "Heb", name: "Hebrews", aliases: ["he"], chapters: CHAPTER_COUNTS_NT[18] },
	{ osis: "Jas", name: "James", aliases: ["jm", "ja"], chapters: CHAPTER_COUNTS_NT[19] },
	{ osis: "1Pet", name: "1 Peter", aliases: ["1 pe", "1pet", "1 pt", "i peter"], chapters: CHAPTER_COUNTS_NT[20] },
	{ osis: "2Pet", name: "2 Peter", aliases: ["2 pe", "2pet", "ii peter"], chapters: CHAPTER_COUNTS_NT[21] },
	{ osis: "1John", name: "1 John", aliases: ["1 jn", "1john", "i john"], chapters: CHAPTER_COUNTS_NT[22] },
	{ osis: "2John", name: "2 John", aliases: ["2 jn", "2john"], chapters: CHAPTER_COUNTS_NT[23] },
	{ osis: "3John", name: "3 John", aliases: ["3 jn", "3john"], chapters: CHAPTER_COUNTS_NT[24] },
	{ osis: "Jude", name: "Jude", aliases: ["jud", "jd"], chapters: CHAPTER_COUNTS_NT[25] },
	{ osis: "Rev", name: "Revelation", aliases: ["re", "rv", "apocalypse"], chapters: CHAPTER_COUNTS_NT[26] },
];

export const DEUTERO_BOOKS: BookRecord[] = [
	{ osis: "Tob", name: "Tobit", aliases: ["tb", "tobit"], chapters: 14 },
	{ osis: "Jdt", name: "Judith", aliases: ["jdt", "judith"], chapters: 16 },
	{ osis: "Wis", name: "Wisdom", aliases: ["wis", "wisdom of solomon"], chapters: 19 },
	{
		osis: "Sir",
		name: "Sirach",
		aliases: ["sirach", "ecclesiasticus", "ecclus"],
		chapters: 51,
	},
	{ osis: "Bar", name: "Baruch", aliases: ["bar"], chapters: 6 },
	{ osis: "1Macc", name: "1 Maccabees", aliases: ["1 macc", "1macc"], chapters: 16 },
	{ osis: "2Macc", name: "2 Maccabees", aliases: ["2 macc", "2macc"], chapters: 15 },
];

let activeBooks: BookRecord[] = [...PROTESTANT_BOOKS];
const byOsis = new Map<string, BookRecord>();

function rebuildByOsis(): void {
	byOsis.clear();
	for (const b of activeBooks) byOsis.set(b.osis, b);
}

export function configureCanon(
	includeDeuterocanon: boolean,
	aliasOverrides: Record<string, string> = {}
): void {
	activeBooks = includeDeuterocanon ? [...PROTESTANT_BOOKS, ...DEUTERO_BOOKS] : [...PROTESTANT_BOOKS];
	rebuildByOsis();
	syncFuzzyBooks(activeBooks, aliasOverrides);
}

export function getActiveBookList(): BookRecord[] {
	return activeBooks;
}

export function getBookByOsis(osis: string): BookRecord | undefined {
	return byOsis.get(osis);
}

export function normalizeKey(bookOsis: string, chapter: number, verseStart: number, verseEnd: number): string {
	return `${bookOsis}:${chapter}:${verseStart}-${verseEnd}`;
}

rebuildByOsis();
syncFuzzyBooks(activeBooks, {});
