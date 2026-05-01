import type { ParsedReference, PassageSegment } from "./types";
import { getActiveBookList, getBookByOsis } from "./books";
import { maxVerseForChapter } from "./verse-limits";

const COMPACT_EXTRA: Record<string, string> = {};

export function setOsisCompactExtras(map: Record<string, string>): void {
	for (const k of Object.keys(COMPACT_EXTRA)) delete COMPACT_EXTRA[k];
	for (const [k, v] of Object.entries(map)) {
		COMPACT_EXTRA[k.toLowerCase().replace(/\s+/g, "")] = v;
	}
}

const COMPACT_TO_OSIS: Record<string, string> = {
	jn: "John",
	jhn: "John",
	mt: "Matt",
	mk: "Mark",
	lk: "Luke",
	lu: "Luke",
	ro: "Rom",
	ga: "Gal",
	php: "Phil",
	col: "Col",
	phm: "Phlm",
	philem: "Phlm",
	jm: "Jas",
	jas: "Jas",
	jud: "Jude",
	re: "Rev",
	rev: "Rev",
	ps: "Ps",
	psa: "Ps",
	prv: "Prov",
	pr: "Prov",
	sos: "Song",
	cant: "Song",
	eccl: "Eccl",
	qoh: "Eccl",
	dan: "Dan",
	gen: "Gen",
	exo: "Exod",
	exod: "Exod",
	ex: "Exod",
	lev: "Lev",
	lv: "Lev",
	num: "Num",
	nm: "Num",
	deu: "Deut",
	deut: "Deut",
	jos: "Josh",
	jdg: "Judg",
	ru: "Ruth",
	isa: "Isa",
	is: "Isa",
	jer: "Jer",
	ezk: "Ezek",
	eze: "Ezek",
	hos: "Hos",
	joe: "Joel",
	amo: "Amos",
	oba: "Obad",
	jon: "Jonah",
	jonah: "Jonah",
	mic: "Mic",
	nah: "Nah",
	hab: "Hab",
	zep: "Zeph",
	hag: "Hag",
	zec: "Zech",
	mal: "Mal",
	mat: "Matt",
};

const OSIS_TO_API_BIBLE: Record<string, string> = {
	Gen: "GEN",
	Exod: "EXO",
	Lev: "LEV",
	Num: "NUM",
	Deut: "DEU",
	Josh: "JOS",
	Judg: "JDG",
	Ruth: "RUT",
	"1Sam": "1SA",
	"2Sam": "2SA",
	"1Kgs": "1KI",
	"2Kgs": "2KI",
	"1Chr": "1CH",
	"2Chr": "2CH",
	Ezra: "EZR",
	Neh: "NEH",
	Esth: "EST",
	Job: "JOB",
	Ps: "PSA",
	Prov: "PRO",
	Eccl: "ECC",
	Song: "SNG",
	Isa: "ISA",
	Jer: "JER",
	Lam: "LAM",
	Ezek: "EZK",
	Dan: "DAN",
	Hos: "HOS",
	Joel: "JOE",
	Amos: "AMO",
	Obad: "OBA",
	Jonah: "JON",
	Mic: "MIC",
	Nah: "NAH",
	Hab: "HAB",
	Zeph: "ZEP",
	Hag: "HAG",
	Zech: "ZEC",
	Mal: "MAL",
	Matt: "MAT",
	Mark: "MRK",
	Luke: "LUK",
	John: "JHN",
	Acts: "ACT",
	Rom: "ROM",
	"1Cor": "1CO",
	"2Cor": "2CO",
	Gal: "GAL",
	Eph: "EPH",
	Phil: "PHP",
	Col: "COL",
	"1Thess": "1TH",
	"2Thess": "2TH",
	"1Tim": "1TI",
	"2Tim": "2TI",
	Titus: "TIT",
	Phlm: "PHM",
	Heb: "HEB",
	Jas: "JAS",
	"1Pet": "1PE",
	"2Pet": "2PE",
	"1John": "1JN",
	"2John": "2JN",
	"3John": "3JN",
	Jude: "JUD",
	Rev: "REV",
	Tob: "TOB",
	Jdt: "JDT",
	Wis: "WIS",
	Sir: "SIR",
	Bar: "BAR",
	"1Macc": "1MA",
	"2Macc": "2MA",
};

export function toApiBibleUsfmSeg(seg: PassageSegment): string {
	const code = OSIS_TO_API_BIBLE[seg.bookOsis] ?? seg.bookOsis.toUpperCase().slice(0, 3);
	const start = `${code}.${seg.chapter}.${seg.verses.start}`;
	if (seg.verses.end === seg.verses.start) return start;
	return `${start}-${code}.${seg.chapter}.${seg.verses.end}`;
}

export function toNumericOsisString(segments: PassageSegment[]): string {
	return segments
		.map((s) => `${s.bookOsis}.${s.chapter}.${s.verses.start}${s.verses.end !== s.verses.start ? `-${s.verses.end}` : ""}`)
		.join(",");
}

function resolveCompactBookToken(tok: string): string | null {
	const t = tok.trim();
	const withDigit = t.match(/^(\d+)\s*([A-Za-z]+)$/);
	if (withDigit) {
		const num = withDigit[1];
		const rest = withDigit[2]!.toLowerCase();
		const key = `${num}${rest}`;
		const candidates: Record<string, string> = {
			"1cor": "1Cor",
			"2cor": "2Cor",
			"1corinthians": "1Cor",
			"2corinthians": "2Cor",
			"1sam": "1Sam",
			"2sam": "2Sam",
			"1samuel": "1Sam",
			"2samuel": "2Sam",
			"1ki": "1Kgs",
			"2ki": "2Kgs",
			"1kgs": "1Kgs",
			"2kgs": "2Kgs",
			"1ch": "1Chr",
			"2ch": "2Chr",
			"1chr": "1Chr",
			"2chr": "2Chr",
			"1th": "1Thess",
			"2th": "2Thess",
			"1thess": "1Thess",
			"2thess": "2Thess",
			"1ti": "1Tim",
			"2ti": "2Tim",
			"1tim": "1Tim",
			"2tim": "2Tim",
			"1pe": "1Pet",
			"2pe": "2Pet",
			"1pet": "1Pet",
			"2pet": "2Pet",
			"1jn": "1John",
			"2jn": "2John",
			"3jn": "3John",
			"1john": "1John",
			"2john": "2John",
			"3john": "3John",
			"1macc": "1Macc",
			"2macc": "2Macc",
		};
		const c = candidates[key];
		if (c) return c;
		if (num === "1" && rest === "cor") return "1Cor";
		if (num === "2" && rest === "cor") return "2Cor";
	}
	const lower = t.toLowerCase().replace(/\s+/g, "");
	const compact = COMPACT_TO_OSIS[lower] ?? COMPACT_EXTRA[lower] ?? null;
	if (compact) return compact;
	const b = getBookByOsis(t);
	if (b) return b.osis;
	for (const book of getActiveBookList()) {
		if (book.name.toLowerCase() === t.toLowerCase()) return book.osis;
	}
	const b2 = getBookByOsis(t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
	return b2?.osis ?? null;
}

export function tryParseOsisLike(input: string): ParsedReference | null {
	const raw = input.replace(/\u2013|\u2014/g, "-").trim();
	const dot = raw.match(
		/^(\d?[A-Za-z]+)\.(\d+)\.(\d+)(?:-(\d+))?$|^(\d?[A-Za-z]+)\s+(\d+)\s*:\s*(\d+)(?:\s*[-–—]\s*(\d+))?$/i
	);
	if (dot) {
		let bookTok: string;
		let chapter: number;
		let v1: number;
		let v2: number | undefined;
		if (dot[1] !== undefined) {
			bookTok = dot[1]!;
			chapter = parseInt(dot[2]!, 10);
			v1 = parseInt(dot[3]!, 10);
			v2 = dot[4] ? parseInt(dot[4], 10) : undefined;
		} else {
			bookTok = dot[5]!;
			chapter = parseInt(dot[6]!, 10);
			v1 = parseInt(dot[7]!, 10);
			v2 = dot[8] ? parseInt(dot[8], 10) : undefined;
		}
		const osis = resolveCompactBookToken(bookTok);
		if (!osis) return null;
		const b = getBookByOsis(osis);
		if (!b || chapter < 1 || chapter > b.chapters) return null;
		const end = v2 !== undefined && v2 >= v1 ? v2 : v1;
		const maxV = maxVerseForChapter(osis, chapter);
		const seg: PassageSegment = {
			bookOsis: osis,
			chapter,
			verses: { start: v1, end: Math.min(end, maxV) },
		};
		return {
			segments: [seg],
			human: raw,
		};
	}
	return null;
}
