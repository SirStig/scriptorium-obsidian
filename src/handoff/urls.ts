import type { PassageSegment } from "../reference/types";
import { getBookByOsis, PROTESTANT_BOOKS } from "../reference/books";
import { toApiBibleUsfmSeg } from "../reference/osis";
import type { ExternalApp } from "../settings";
import type { HandoffOpts } from "./types";

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

export function openExternalApp(app: ExternalApp, opts: HandoffOpts, seg: PassageSegment): string | null {
	if (app === "none") return null;
	if (app === "olivetree") return buildOliveTreeUrl(opts.scheme, seg);
	if (app === "biblia_web") return buildBibliaWebUrl(opts.translation, seg);
	if (app === "youversion") return buildYouVersionUrl(opts.youVersionId, seg);
	if (app === "accordance") return buildAccordanceUrl(seg);
	if (app === "logos_uri") return null;
	return null;
}

export const LOGOS_URI_PATTERN = /\b(logosres:|logos4:|logosft:)[^\s)>\]]+/i;
