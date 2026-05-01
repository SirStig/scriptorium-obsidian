import type { PassageSegment } from "../reference/types";
import { getBookByOsis, PROTESTANT_BOOKS } from "../reference/books";
import { toApiBibleUsfmSeg } from "../reference/osis";
import type { ExternalApp } from "../settings";
import type { HandoffOpts } from "./types";

const OSIS_TO_LOG_REFPASS: Record<string, string> = {
	Gen: "Gen",
	Exod: "Ex",
	Lev: "Lev",
	Num: "Num",
	Deut: "Dt",
	Josh: "Jos",
	Judg: "Jdg",
	Ruth: "Rut",
	"1Sam": "1Sam",
	"2Sam": "2Sam",
	"1Kgs": "1Ki",
	"2Kgs": "2Ki",
	"1Chr": "1Ch",
	"2Chr": "2Ch",
	Ezra: "Ezr",
	Neh: "Neh",
	Esth: "Est",
	Job: "Job",
	Ps: "Ps",
	Prov: "Pro",
	Eccl: "Ecc",
	Song: "Son",
	Isa: "Isa",
	Jer: "Jer",
	Lam: "Lam",
	Ezek: "Eze",
	Dan: "Dan",
	Hos: "Hos",
	Joel: "Joe",
	Amos: "Am",
	Obad: "Ob",
	Jonah: "Jon",
	Mic: "Mi",
	Nah: "Nah",
	Hab: "Hab",
	Zeph: "Zep",
	Hag: "Hag",
	Zech: "Zec",
	Mal: "Mal",
	Matt: "Mt",
	Mark: "Mk",
	Luke: "Lk",
	John: "Joh",
	Acts: "Act",
	Rom: "Rom",
	"1Cor": "1Co",
	"2Cor": "2Co",
	Gal: "Gal",
	Eph: "Eph",
	Phil: "Phi",
	Col: "Col",
	"1Thess": "1Th",
	"2Thess": "2Th",
	"1Tim": "1Tim",
	"2Tim": "2Tim",
	Titus: "Tit",
	Phlm: "Phm",
	Heb: "Heb",
	Jas: "Jam",
	"1Pet": "1Pt",
	"2Pet": "2Pt",
	"1John": "1Jo",
	"2John": "2Jo",
	"3John": "3Jo",
	Jude: "Jud",
	Rev: "Rev",
	Tob: "Tob",
	Jdt: "Jdt",
	Wis: "Wis",
	Sir: "Sir",
	Bar: "Bar",
	"1Macc": "1Macc",
	"2Macc": "2Macc",
};

export function formatLogosRefPassage(seg: PassageSegment): string | null {
	const book = OSIS_TO_LOG_REFPASS[seg.bookOsis];
	if (!book) return null;
	const c = seg.chapter;
	const a = seg.verses.start;
	const b = seg.verses.end;
	const start = `${book}${c}.${a}`;
	if (b === a) return start;
	return `${start}-${b}`;
}

export function buildLogosResUrl(opts: HandoffOpts, seg: PassageSegment): string | null {
	const alias = opts.logosResourceAlias.trim();
	const prefix = opts.logosRefPrefix.trim();
	if (!alias || !prefix) return null;
	const pass = formatLogosRefPassage(seg);
	if (!pass) return null;
	return `logosres:${alias};ref=${prefix}.${pass}`;
}

function protestantBookNumber(osis: string): number {
	const i = PROTESTANT_BOOKS.findIndex((b) => b.osis === osis);
	return i >= 0 ? i + 1 : 0;
}

function oliveBookSpec(seg: PassageSegment): string {
	const n = protestantBookNumber(seg.bookOsis);
	if (n > 0) return String(n);
	const b = getBookByOsis(seg.bookOsis);
	const name = b?.name.replace(/\s+/g, "%20") ?? seg.bookOsis;
	return name;
}

export function buildOliveTreeUrl(
	scheme: string,
	seg: PassageSegment
): string {
	const book = oliveBookSpec(seg);
	const v = seg.verses.start;
	return `${scheme}://bible/${book}.${seg.chapter}.${v}`;
}

export function buildBibliaWebUrl(translation: string, seg: PassageSegment): string {
	const b = getBookByOsis(seg.bookOsis);
	const bookSlug = (b?.name ?? seg.bookOsis).replace(/\s+/g, "-");
	const t = encodeURIComponent(translation);
	const ref = `${bookSlug}.${seg.chapter}.${seg.verses.start}-${seg.verses.end}`;
	return `https://biblia.com/bible/${t}/${ref}`;
}

export function buildYouVersionUrl(bibleId: string, seg: PassageSegment): string {
	const id = bibleId.trim() || "1";
	const ref = toApiBibleUsfmSeg(seg);
	return `https://www.bible.com/bible/${encodeURIComponent(id)}/${ref}`;
}

export function buildAccordanceUrl(seg: PassageSegment): string {
	const b = getBookByOsis(seg.bookOsis);
	const name = (b?.name ?? seg.bookOsis).replace(/\s+/g, "_");
	const ref =
		seg.verses.start === seg.verses.end
			? `${name}_${seg.chapter}:${seg.verses.start}`
			: `${name}_${seg.chapter}:${seg.verses.start}-${seg.verses.end}`;
	return `accord://read?${encodeURIComponent(ref)}`;
}

export function buildBibleGatewayUrl(translation: string, seg: PassageSegment): string {
	const b = getBookByOsis(seg.bookOsis);
	const bookSlug = (b?.name ?? seg.bookOsis).replace(/\s+/g, "+");
	const ref =
		seg.verses.start === seg.verses.end
			? `${bookSlug}+${seg.chapter}:${seg.verses.start}`
			: `${bookSlug}+${seg.chapter}:${seg.verses.start}-${seg.verses.end}`;
	const v = encodeURIComponent(translation || "ESV");
	return `https://www.biblegateway.com/passage/?search=${ref}&version=${v}`;
}

export function buildBlueLetterBibleUrl(seg: PassageSegment): string {
	const b = getBookByOsis(seg.bookOsis);
	const name = (b?.name ?? seg.bookOsis).toLowerCase().replace(/\s+/g, "");
	return `https://www.blueletterbible.org/kjv/${encodeURIComponent(name)}/${seg.chapter}/${seg.verses.start}`;
}

export function buildStepBibleUrl(seg: PassageSegment): string {
	const b = getBookByOsis(seg.bookOsis);
	const name = (b?.name ?? seg.bookOsis).replace(/\s+/g, "");
	const ref =
		seg.verses.start === seg.verses.end
			? `${name}.${seg.chapter}.${seg.verses.start}`
			: `${name}.${seg.chapter}.${seg.verses.start}-${seg.verses.end}`;
	return `https://www.stepbible.org/?q=reference=${encodeURIComponent(ref)}`;
}

export function openExternalApp(app: ExternalApp, opts: HandoffOpts, seg: PassageSegment): string | null {
	if (app === "none") return null;
	if (app === "olivetree") return buildOliveTreeUrl(opts.scheme, seg);
	if (app === "biblia_web") return buildBibliaWebUrl(opts.translation, seg);
	if (app === "youversion") return buildYouVersionUrl(opts.youVersionId, seg);
	if (app === "accordance") return buildAccordanceUrl(seg);
	if (app === "logos_uri") return buildLogosResUrl(opts, seg);
	if (app === "biblegateway") return buildBibleGatewayUrl(opts.translation, seg);
	if (app === "blueletter") return buildBlueLetterBibleUrl(seg);
	if (app === "stepbible") return buildStepBibleUrl(seg);
	return null;
}

export const LOGOS_URI_PATTERN = /\b(logosres:|logos4:|logosft:)[^\s)>\]]+/i;
