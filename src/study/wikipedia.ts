import { requestUrl } from "obsidian";

/**
 * Wikipedia REST API summary fetcher (no key, free).
 *
 * Endpoint: https://en.wikipedia.org/api/rest_v1/page/summary/<title>
 *
 * Returns a curated lead extract + canonical URL for a page. Used to
 * auto-seed "Background" sections in chapter hub notes.
 *
 * Title slugs follow Wikipedia's URL form (spaces → underscores; URL-encoded).
 * The map below routes biblical book OSIS ids → the canonical article title
 * since some have disambiguation pages or non-obvious slugs ("Book of Genesis"
 * not "Genesis").
 */

const TITLES: Record<string, string> = {
	Gen: "Book of Genesis",
	Exod: "Book of Exodus",
	Lev: "Book of Leviticus",
	Num: "Book of Numbers",
	Deut: "Book of Deuteronomy",
	Josh: "Book of Joshua",
	Judg: "Book of Judges",
	Ruth: "Book of Ruth",
	"1Sam": "Books of Samuel",
	"2Sam": "Books of Samuel",
	"1Kgs": "Books of Kings",
	"2Kgs": "Books of Kings",
	"1Chr": "Books of Chronicles",
	"2Chr": "Books of Chronicles",
	Ezra: "Book of Ezra",
	Neh: "Book of Nehemiah",
	Esth: "Book of Esther",
	Job: "Book of Job",
	Ps: "Psalms",
	Prov: "Book of Proverbs",
	Eccl: "Ecclesiastes",
	Song: "Song of Songs",
	Isa: "Book of Isaiah",
	Jer: "Book of Jeremiah",
	Lam: "Book of Lamentations",
	Ezek: "Book of Ezekiel",
	Dan: "Book of Daniel",
	Hos: "Book of Hosea",
	Joel: "Book of Joel",
	Amos: "Book of Amos",
	Obad: "Book of Obadiah",
	Jonah: "Book of Jonah",
	Mic: "Book of Micah",
	Nah: "Book of Nahum",
	Hab: "Book of Habakkuk",
	Zeph: "Book of Zephaniah",
	Hag: "Book of Haggai",
	Zech: "Book of Zechariah",
	Mal: "Book of Malachi",
	Matt: "Gospel of Matthew",
	Mark: "Gospel of Mark",
	Luke: "Gospel of Luke",
	John: "Gospel of John",
	Acts: "Acts of the Apostles",
	Rom: "Epistle to the Romans",
	"1Cor": "First Epistle to the Corinthians",
	"2Cor": "Second Epistle to the Corinthians",
	Gal: "Epistle to the Galatians",
	Eph: "Epistle to the Ephesians",
	Phil: "Epistle to the Philippians",
	Col: "Epistle to the Colossians",
	"1Thess": "First Epistle to the Thessalonians",
	"2Thess": "Second Epistle to the Thessalonians",
	"1Tim": "First Epistle to Timothy",
	"2Tim": "Second Epistle to Timothy",
	Titus: "Epistle to Titus",
	Phlm: "Epistle to Philemon",
	Heb: "Epistle to the Hebrews",
	Jas: "Epistle of James",
	"1Pet": "First Epistle of Peter",
	"2Pet": "Second Epistle of Peter",
	"1John": "First Epistle of John",
	"2John": "Second Epistle of John",
	"3John": "Third Epistle of John",
	Jude: "Epistle of Jude",
	Rev: "Book of Revelation",
	Tob: "Book of Tobit",
	Jdt: "Book of Judith",
	Wis: "Book of Wisdom",
	Sir: "Sirach",
	Bar: "Book of Baruch",
	"1Macc": "1 Maccabees",
	"2Macc": "2 Maccabees",
};

export type WikiSummary = {
	title: string;
	extract: string;
	url: string;
};

export async function fetchBookSummary(bookOsis: string): Promise<WikiSummary | null> {
	const title = TITLES[bookOsis];
	if (!title) return null;
	const slug = encodeURIComponent(title.replace(/\s+/g, "_"));
	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`;
	try {
		const res = await requestUrl({ url });
		if (res.status !== 200) return null;
		const data = JSON.parse(res.text) as {
			title?: string;
			extract?: string;
			content_urls?: { desktop?: { page?: string } };
		};
		if (!data.extract) return null;
		return {
			title: data.title ?? title,
			extract: data.extract.trim(),
			url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${slug}`,
		};
	} catch {
		return null;
	}
}
