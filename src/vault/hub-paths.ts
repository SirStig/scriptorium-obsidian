import type { PassageSegment } from "../reference/types";
import { getBookByOsis } from "../reference/books";

export function hubTitle(bookOsis: string, chapter: number, verseStart: number, verseEnd: number): string {
	const b = getBookByOsis(bookOsis);
	const name = b?.name ?? bookOsis;
	if (verseStart === verseEnd) return `${name} ${chapter}:${verseStart}`;
	return `${name} ${chapter}:${verseStart}–${verseEnd}`;
}

export function hubRelPath(
	hubFolder: string,
	perChapter: boolean,
	seg: PassageSegment
): string {
	const b = getBookByOsis(seg.bookOsis);
	const bookFolder = (b?.name ?? seg.bookOsis).replace(/[/\\:?*"<>|]/g, "-");
	const base = hubFolder.replace(/\/$/, "");
	if (perChapter) {
		return `${base}/${bookFolder}/ch-${seg.chapter}.md`;
	}
	const v =
		seg.verses.start === seg.verses.end
			? `v${seg.verses.start}`
			: `v${seg.verses.start}-${seg.verses.end}`;
	return `${base}/${bookFolder}/ch-${seg.chapter}-${v}.md`;
}

export function hubFrontmatter(seg: PassageSegment): string {
	const b = getBookByOsis(seg.bookOsis);
	const tag = `passage/${seg.bookOsis.toLowerCase()}/${seg.chapter}`;
	return `---
osis: "${seg.bookOsis}"
book: "${b?.name ?? seg.bookOsis}"
chapter: ${seg.chapter}
verse_start: ${seg.verses.start}
verse_end: ${seg.verses.end}
aliases: ["${hubTitle(seg.bookOsis, seg.chapter, seg.verses.start, seg.verses.end)}"]
tags:
  - ${tag}
---
`;
}
