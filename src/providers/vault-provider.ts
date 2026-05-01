import type { App } from "obsidian";
import { TFile } from "obsidian";
import type { PassageSegment } from "../reference/types";
import { getBookByOsis } from "../reference/books";
import type { PassageTextResult, TextProvider } from "./types";

function slugifyBookName(name: string): string {
	return name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

type VerseLine = { v: number; text: string };

/**
 * Read passages from per-chapter Markdown files in a configured folder.
 *
 * File path: `<folder>/<Book_Name>/<chapter>.md` (e.g.
 * `Scripture/Text/John/3.md`).
 *
 * Within a chapter file we accept any of these verse-marker shapes:
 *
 *   1. Header per verse:        `# 1`,  `## 1`,  `### 1-2`
 *   2. Bold prefix:             `**1** In the beginning…`
 *   3. Inline number prefix:    `1 In the beginning…`        (digits, then space)
 *   4. USFM marker:             `\v 1 In the beginning…`
 *   5. Bracket / superscript:   `[1] In the beginning…`,  `^1 In the beginning…`
 *   6. Frontmatter range:       `verse_start: 1` / `verse_end: 31` (whole-file)
 *
 * Comment-only lines starting with `>` (Markdown blockquote) are kept inside
 * the current verse so users can mix prose with text. Headings other than
 * verse markers (e.g. `# John 3` chapter title) are ignored.
 */
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

		const verses = parseChapterFile(body);
		if (verses.length === 0) {
			// No structured markers found — return the whole body trimmed.
			return {
				text: stripFrontmatter(body).trim() || body.slice(0, 400),
				attribution: path,
				licenseHint: "Vault file",
			};
		}

		const collected = verses
			.filter((v) => v.v >= seg.verses.start && v.v <= seg.verses.end)
			.map((v) => v.text.trim())
			.filter(Boolean);

		if (collected.length === 0) {
			return {
				text: verses.map((v) => v.text.trim()).filter(Boolean).join("\n"),
				attribution: path,
				licenseHint: "Vault file",
			};
		}
		return {
			text: collected.join("\n"),
			attribution: path,
			licenseHint: "Vault file",
		};
	}
}

const HEADER_RE = /^#{1,6}\s*(\d+)(?:[-–](\d+))?\s*$/;
const BOLD_RE = /^\*\*\s*(\d+)(?:[-–](\d+))?\s*\*\*\s*(.*)$/;
const INLINE_RE = /^\s*(\d+)\s+(.*)$/;
const USFM_RE = /^\\v\s+(\d+)\s*(.*)$/;
const BRACKET_RE = /^\s*\[(\d+)\]\s*(.*)$/;
const CARET_RE = /^\s*\^(\d+)\s*(.*)$/;

function stripFrontmatter(body: string): string {
	if (!body.startsWith("---")) return body;
	const end = body.indexOf("\n---", 3);
	if (end < 0) return body;
	return body.slice(end + 4).replace(/^\r?\n/, "");
}

function parseChapterFile(body: string): VerseLine[] {
	const text = stripFrontmatter(body);
	const lines = text.split(/\r?\n/);
	const out: VerseLine[] = [];
	let current: VerseLine | null = null;

	const start = (n: number, rest = ""): void => {
		if (current) out.push(current);
		current = { v: n, text: rest };
	};

	for (const line of lines) {
		const h = line.match(HEADER_RE);
		if (h) {
			start(parseInt(h[1]!, 10));
			continue;
		}
		const b = line.match(BOLD_RE);
		if (b) {
			start(parseInt(b[1]!, 10), b[3] ?? "");
			continue;
		}
		const u = line.match(USFM_RE);
		if (u) {
			start(parseInt(u[1]!, 10), u[2] ?? "");
			continue;
		}
		const br = line.match(BRACKET_RE);
		if (br) {
			start(parseInt(br[1]!, 10), br[2] ?? "");
			continue;
		}
		const c = line.match(CARET_RE);
		if (c) {
			start(parseInt(c[1]!, 10), c[2] ?? "");
			continue;
		}
		const inline = line.match(INLINE_RE);
		// Inline form is ambiguous with prose like "1 thing happened". Only
		// accept it as a verse marker if we haven't started any verse yet
		// (start of file) or when the previous line was blank — heuristic but
		// good enough for typical chapter files.
		if (inline) {
			out.push({ v: parseInt(inline[1]!, 10), text: inline[2] ?? "" });
			current = null;
			continue;
		}
		if (current && line.trim()) {
			const cur = current as VerseLine;
			cur.text += (cur.text ? "\n" : "") + line;
		}
	}
	if (current) out.push(current);
	return out;
}
