import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { PassageSegment } from "../reference/types";
import { hubFrontmatter, hubRelPath, hubTitle } from "./hub-paths";

export { hubRelPath, hubTitle } from "./hub-paths";

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
