import { getBookByOsis } from "./books";

const SPARSE_MAX: Record<string, number> = {
	"Obad:1": 21,
	"Phlm:1": 25,
	"2John:1": 13,
	"3John:1": 14,
	"Jude:1": 25,
	"Ps:117": 2,
	"Ps:119": 176,
	"Ps:131": 3,
	"Ps:133": 3,
	"Job:42": 17,
	"Acts:20": 38,
	"Acts:27": 44,
};

export function maxVerseForChapter(bookOsis: string, chapter: number): number {
	const k = `${bookOsis}:${chapter}`;
	if (SPARSE_MAX[k] !== undefined) return SPARSE_MAX[k]!;
	const b = getBookByOsis(bookOsis);
	if (!b || chapter < 1 || chapter > b.chapters) return 60;
	if (bookOsis === "Ps") {
		if (chapter === 119) return 176;
		if (chapter === 117) return 2;
		return 45;
	}
	if (bookOsis === "Rev" && chapter === 22) return 21;
	if (b.chapters === 1) return 200;
	return 60;
}
