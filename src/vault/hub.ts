import type { App } from "obsidian";
import { TFile } from "obsidian";
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

function hubFrontmatter(seg: PassageSegment): string {
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

export async function ensureHubNote(
	app: App,
	hubFolder: string,
	perChapter: boolean,
	seg: PassageSegment
): Promise<TFile> {
	const path = hubRelPath(hubFolder, perChapter, seg);
	const existing = app.vault.getAbstractFileByPath(path);
	if (existing instanceof TFile) return existing;
	const dir = path.split("/").slice(0, -1).join("/");
	if (dir) {
		const parts = dir.split("/").filter(Boolean);
		let acc = "";
		for (const p of parts) {
			acc = acc ? `${acc}/${p}` : p;
			if (!app.vault.getAbstractFileByPath(acc)) {
				await app.vault.createFolder(acc);
			}
		}
	}
	const body = `${hubFrontmatter(seg)}\n# ${hubTitle(seg.bookOsis, seg.chapter, seg.verses.start, seg.verses.end)}\n\n`;
	return app.vault.create(path, body);
}
