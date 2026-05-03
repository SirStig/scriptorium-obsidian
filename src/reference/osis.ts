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

// Compact tokens not derivable from BookRecord (osis / name / aliases).
// The OSIS dot parser also looks them up via the derived map (built from the
// active book list at call time), so this only needs the genuine extras.
const COMPACT_TO_OSIS: Record<string, string> = {
	jhn: "John",
	prv: "Prov",
	qoh: "Eccl",
	joe: "Joel",
	amo: "Amos",
	oba: "Obad",
	deu: "Deut",
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

function normalizeKey(s: string): string {
	return s.toLowerCase().replace(/\s+/g, "");
}

function buildDerivedCompactMap(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const book of getActiveBookList()) {
		out[normalizeKey(book.osis)] = book.osis;
		out[normalizeKey(book.name)] = book.osis;
		for (const a of book.aliases) out[normalizeKey(a)] = book.osis;
	}
	return out;
}

function resolveCompactBookToken(tok: string): string | null {
	const lower = normalizeKey(tok);
	const derived = buildDerivedCompactMap();
	if (derived[lower]) return derived[lower];
	if (COMPACT_TO_OSIS[lower]) return COMPACT_TO_OSIS[lower];
	if (COMPACT_EXTRA[lower]) return COMPACT_EXTRA[lower];
	const b = getBookByOsis(tok.trim());
	if (b) return b.osis;
	const b2 = getBookByOsis(tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase());
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
		if (v1 < 1 || v1 > maxV) return null;
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
