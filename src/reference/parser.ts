import { getBookByOsis, normalizeKey } from "./books";
import { matchBookPrefix } from "./fuzzy";
import { tryParseOsisLike } from "./osis";
import { maxVerseForChapter } from "./verse-limits";
import type { ParsedReference, PassageSegment, VerseSpan } from "./types";

const CV_RANGE = /^(\d+)\s*[:.]\s*(\d+)\s*(?:[-–—]\s*(\d+))?/;
const CHAPTER_ONLY = /^(\d+)\s*$/;

function validateChapter(bookOsis: string, chapter: number): boolean {
	const b = getBookByOsis(bookOsis);
	return !!b && chapter >= 1 && chapter <= b.chapters;
}

function span(a: number, b?: number): VerseSpan {
	if (b === undefined || b < a) return { start: a, end: a };
	return { start: a, end: b };
}

function parseChapterVerseChunk(rest: string): { chapter: number; span: VerseSpan; consumed: string } | null {
	const t = rest.trim();
	const m = t.match(CV_RANGE);
	if (!m) return null;
	const chapter = parseInt(m[1]!, 10);
	const v1 = parseInt(m[2]!, 10);
	const v2 = m[3] ? parseInt(m[3], 10) : undefined;
	return {
		chapter,
		span: span(v1, v2),
		consumed: m[0],
	};
}

function segmentHuman(bookName: string, chapter: number, s: VerseSpan): string {
	if (s.start === s.end) return `${bookName} ${chapter}:${s.start}`;
	return `${bookName} ${chapter}:${s.start}–${s.end}`;
}

function chapterVersesEnd(bookOsis: string, chapter: number): VerseSpan {
	const end = maxVerseForChapter(bookOsis, chapter);
	return { start: 1, end };
}

export function parseReference(input: string): ParsedReference | null {
	const raw = input.replace(/\u2013|\u2014/g, "-").trim();
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
		const partHuman: string[] = [];
		let tail = part.slice(m.end).trim();
		tail = tail.replace(/^[.,;:]+/, "").trim();
		const chunks = tail
			.split(/\s*,\s*/)
			.map((c) => c.trim())
			.filter(Boolean);
		const partSegments: PassageSegment[] = [];
		if (chunks.length === 0) {
			const co = tail.match(CHAPTER_ONLY);
			if (co) {
				const ch = parseInt(co[1]!, 10);
				if (validateChapter(book.osis, ch)) {
					const vs = chapterVersesEnd(book.osis, ch);
					partSegments.push({
						bookOsis: book.osis,
						chapter: ch,
						verses: vs,
					});
					partHuman.push(`${book.name} ${ch} (chapter)`);
				}
			}
			segments.push(...partSegments);
			humanParts.push(...partHuman);
			continue;
		}

		let currentChapter: number | null = null;
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i]!;
			const cv = parseChapterVerseChunk(chunk);
			if (!cv) {
				const co = chunk.match(CHAPTER_ONLY);
				if (co) {
					currentChapter = parseInt(co[1]!, 10);
				}
				continue;
			}
			const ch = cv.chapter;
			if (!validateChapter(book.osis, ch)) continue;
			currentChapter = ch;
			const maxV = maxVerseForChapter(book.osis, ch);
			const endV = Math.min(cv.span.end, maxV);
			const startV = Math.min(cv.span.start, maxV);
			partSegments.push({
				bookOsis: book.osis,
				chapter: ch,
				verses: { start: startV, end: Math.max(startV, endV) },
			});
			partHuman.push(segmentHuman(book.name, ch, { start: startV, end: Math.max(startV, endV) }));
		}

		if (partSegments.length === 0 && currentChapter !== null && validateChapter(book.osis, currentChapter)) {
			const vs = chapterVersesEnd(book.osis, currentChapter);
			partSegments.push({
				bookOsis: book.osis,
				chapter: currentChapter,
				verses: vs,
			});
			partHuman.push(`${book.name} ${currentChapter} (chapter)`);
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
