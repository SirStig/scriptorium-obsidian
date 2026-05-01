import { getBookByOsis } from "./books";
import { VERSE_COUNTS } from "./verse-data";

export function maxVerseForChapter(bookOsis: string, chapter: number): number {
	const counts = VERSE_COUNTS[bookOsis];
	if (counts && chapter >= 1 && chapter <= counts.length) {
		return counts[chapter - 1]!;
	}
	const b = getBookByOsis(bookOsis);
	if (b && chapter >= 1 && chapter <= b.chapters) return 60;
	return 60;
}

export function totalChaptersForBook(bookOsis: string): number {
	const counts = VERSE_COUNTS[bookOsis];
	if (counts) return counts.length;
	const b = getBookByOsis(bookOsis);
	return b?.chapters ?? 0;
}
