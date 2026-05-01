import { getBookByOsis, normalizeKey } from "./books";
import { matchBookPrefix } from "./fuzzy";
import { tryParseOsisLike } from "./osis";
import { maxVerseForChapter, totalChaptersForBook } from "./verse-limits";
import type { ParsedReference, PassageSegment, VerseSpan } from "./types";

const CHUNK_RE =
	/^(\d+)(?:\s*[:.]\s*(\d+))?(?:\s*-\s*(\d+)(?:\s*[:.]\s*(\d+))?)?$/;

function validateChapter(bookOsis: string, chapter: number): boolean {
	const total = totalChaptersForBook(bookOsis);
	return total > 0 && chapter >= 1 && chapter <= total;
}

function segmentHuman(bookName: string, chapter: number, s: VerseSpan): string {
	if (s.start === s.end) return `${bookName} ${chapter}:${s.start}`;
	return `${bookName} ${chapter}:${s.start}–${s.end}`;
}

function pushVerseSpan(
	out: PassageSegment[],
	humanOut: string[],
	bookOsis: string,
	bookName: string,
	chapter: number,
	v1: number,
	v2: number
): void {
	if (!validateChapter(bookOsis, chapter)) return;
	const maxV = maxVerseForChapter(bookOsis, chapter);
	if (v1 < 1 || v1 > maxV) return;
	const start = v1;
	const end = Math.max(start, Math.min(v2, maxV));
	out.push({ bookOsis, chapter, verses: { start, end } });
	humanOut.push(segmentHuman(bookName, chapter, { start, end }));
}

function pushFullChapter(
	out: PassageSegment[],
	humanOut: string[],
	bookOsis: string,
	bookName: string,
	chapter: number
): void {
	if (!validateChapter(bookOsis, chapter)) return;
	const max = maxVerseForChapter(bookOsis, chapter);
	out.push({ bookOsis, chapter, verses: { start: 1, end: max } });
	humanOut.push(`${bookName} ${chapter} (chapter)`);
}

function pushChapterRange(
	out: PassageSegment[],
	humanOut: string[],
	bookOsis: string,
	bookName: string,
	c1: number,
	c2: number
): void {
	const lo = Math.min(c1, c2);
	const hi = Math.max(c1, c2);
	for (let c = lo; c <= hi; c++) pushFullChapter(out, humanOut, bookOsis, bookName, c);
}

function pushCrossChapterRange(
	out: PassageSegment[],
	humanOut: string[],
	bookOsis: string,
	bookName: string,
	c1: number,
	v1: number,
	c2: number,
	v2: number
): void {
	if (c1 === c2) {
		pushVerseSpan(out, humanOut, bookOsis, bookName, c1, v1, v2);
		return;
	}
	if (c1 > c2) return;
	const max1 = validateChapter(bookOsis, c1) ? maxVerseForChapter(bookOsis, c1) : 0;
	if (max1 > 0) pushVerseSpan(out, humanOut, bookOsis, bookName, c1, v1, max1);
	for (let c = c1 + 1; c <= c2 - 1; c++) pushFullChapter(out, humanOut, bookOsis, bookName, c);
	if (validateChapter(bookOsis, c2)) pushVerseSpan(out, humanOut, bookOsis, bookName, c2, 1, v2);
}

function pushChapterRangeWithPartialEnd(
	out: PassageSegment[],
	humanOut: string[],
	bookOsis: string,
	bookName: string,
	c1: number,
	c2: number,
	v2: number
): void {
	if (c1 > c2) return;
	for (let c = c1; c <= c2 - 1; c++) pushFullChapter(out, humanOut, bookOsis, bookName, c);
	if (validateChapter(bookOsis, c2)) pushVerseSpan(out, humanOut, bookOsis, bookName, c2, 1, v2);
}

export function parseReference(input: string): ParsedReference | null {
	const raw = input.replace(/–|—/g, "-").trim();
	if (!raw) return null;
	const parts = raw
		.split(/\s*;\s*/)
		.map((p) => p.trim())
		.filter(Boolean);
	const segments: PassageSegment[] = [];
	const humanParts: string[] = [];

	for (const part of parts) {
		const osisHit = tryParseOsisLike(part);
		if (osisHit) {
			segments.push(...osisHit.segments);
			humanParts.push(osisHit.human);
			continue;
		}
		const m = matchBookPrefix(part);
		if (!m) continue;
		const book = m.book;
		const partSegments: PassageSegment[] = [];
		const partHuman: string[] = [];
		let tail = part.slice(m.end).trim();
		tail = tail.replace(/^[.,;:]+/, "").trim();

		if (!tail) {
			segments.push(...partSegments);
			humanParts.push(...partHuman);
			continue;
		}

		const chunks = tail
			.split(/\s*,\s*/)
			.map((c) => c.trim())
			.filter(Boolean);

		let currentChapter: number | null = null;
		let sawVerse = false;

		for (const chunk of chunks) {
			const cm = chunk.match(CHUNK_RE);
			if (!cm) continue;
			const a = parseInt(cm[1]!, 10);
			const hasB = cm[2] !== undefined;
			const b = hasB ? parseInt(cm[2]!, 10) : undefined;
			const hasC = cm[3] !== undefined;
			const c = hasC ? parseInt(cm[3]!, 10) : undefined;
			const hasD = cm[4] !== undefined;
			const d = hasD ? parseInt(cm[4]!, 10) : undefined;

			if (hasB && hasC && hasD) {
				pushCrossChapterRange(partSegments, partHuman, book.osis, book.name, a, b!, c!, d!);
				currentChapter = c!;
				sawVerse = true;
			} else if (hasB && hasC) {
				pushVerseSpan(partSegments, partHuman, book.osis, book.name, a, b!, c!);
				currentChapter = a;
				sawVerse = true;
			} else if (hasB) {
				pushVerseSpan(partSegments, partHuman, book.osis, book.name, a, b!, b!);
				currentChapter = a;
				sawVerse = true;
			} else if (hasC && hasD) {
				pushChapterRangeWithPartialEnd(partSegments, partHuman, book.osis, book.name, a, c!, d!);
				currentChapter = c!;
				sawVerse = true;
			} else if (hasC) {
				if (sawVerse && currentChapter !== null) {
					pushVerseSpan(partSegments, partHuman, book.osis, book.name, currentChapter, a, c!);
				} else {
					pushChapterRange(partSegments, partHuman, book.osis, book.name, a, c!);
					currentChapter = c!;
				}
			} else {
				if (sawVerse && currentChapter !== null) {
					pushVerseSpan(partSegments, partHuman, book.osis, book.name, currentChapter, a, a);
				} else {
					pushFullChapter(partSegments, partHuman, book.osis, book.name, a);
					currentChapter = a;
				}
			}
		}

		segments.push(...partSegments);
		humanParts.push(...partHuman);
	}

	if (segments.length === 0) return null;
	return {
		segments,
		human: humanParts.join("; ") || raw,
	};
}

export function passageToKey(seg: PassageSegment): string {
	return normalizeKey(seg.bookOsis, seg.chapter, seg.verses.start, seg.verses.end);
}

export function formatReferenceHuman(segments: PassageSegment[]): string {
	return segments
		.map((s) => {
			const b = getBookByOsis(s.bookOsis);
			const name = b?.name ?? s.bookOsis;
			return segmentHuman(name, s.chapter, s.verses);
		})
		.join("; ");
}
