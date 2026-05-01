import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { PassageSegment } from "../reference/types";
import { getBookByOsis } from "../reference/books";
import type { PassageTextResult, TextProvider } from "./types";

function slugifyBookName(name: string): string {
	return name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export class VaultFolderTextProvider implements TextProvider {
	id = "vault_folder";

	constructor(
		private app: App,
		private folder: string
	) {}

	async getPassage(seg: PassageSegment): Promise<PassageTextResult | null> {
		const b = getBookByOsis(seg.bookOsis);
		const bookPart = slugifyBookName(b?.name ?? seg.bookOsis);
		const base = this.folder.replace(/\/$/, "");
		const path = `${base}/${bookPart}/${seg.chapter}.md`;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) return null;
		const body = await this.app.vault.read(file);
		const lines = body.split(/\r?\n/);
		const collected: string[] = [];
		let inRange = false;
		for (const line of lines) {
			const hm = line.match(/^#{1,6}\s*(\d+)(?:[-–](\d+))?\s*$/);
			if (hm) {
				const start = parseInt(hm[1]!, 10);
				const end = hm[2] ? parseInt(hm[2], 10) : start;
				inRange = end >= seg.verses.start && start <= seg.verses.end;
				continue;
			}
			const lm = line.match(/^\*\*\s*(\d+)(?:[-–](\d+))?\s*\*\*\s*/);
			if (lm) {
				const start = parseInt(lm[1]!, 10);
				const end = lm[2] ? parseInt(lm[2], 10) : start;
				inRange = end >= seg.verses.start && start <= seg.verses.end;
			}
			if (inRange) collected.push(line);
		}
		if (collected.length === 0) {
			return {
				text: body.slice(0, 400),
				attribution: path,
				licenseHint: "Vault file",
			};
		}
		return {
			text: collected.join("\n").trim(),
			attribution: path,
			licenseHint: "Vault file",
		};
	}
}
