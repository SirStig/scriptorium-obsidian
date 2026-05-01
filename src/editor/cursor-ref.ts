import type { Editor } from "obsidian";
import { parseReference } from "../reference/parser";
import { inlineRefRegex } from "../reference/regex";
import type { ParsedReference } from "../reference/types";

export type CursorRefHit = {
	parsed: ParsedReference;
	matchedText: string;
	from: { line: number; ch: number };
	to: { line: number; ch: number };
};

/**
 * Find a parseable scripture reference at the cursor position.
 *
 * Resolution order:
 *   1. The current selection, if it parses.
 *   2. The match under the cursor on the current line (whose span covers the cursor).
 *   3. The first match on the current line.
 *
 * Returns the parsed result plus the editor span the match occupies, so callers
 * can replace it in place (e.g. convert-to-wikilink) or just open it.
 */
export function findRefAtCursor(editor: Editor): CursorRefHit | null {
	const cur = editor.getCursor();
	const sel = editor.getSelection().trim();
	if (sel) {
		const p = parseReference(sel);
		if (p) {
			return {
				parsed: p,
				matchedText: sel,
				from: editor.getCursor("from"),
				to: editor.getCursor("to"),
			};
		}
	}

	const line = editor.getLine(cur.line);
	const re = inlineRefRegex("g");
	let m: RegExpExecArray | null;
	let firstHit: CursorRefHit | null = null;
	while ((m = re.exec(line)) !== null) {
		const slice = m[1]!;
		const start = m.index;
		const end = start + slice.length;
		const p = parseReference(slice);
		if (!p) continue;
		const hit: CursorRefHit = {
			parsed: p,
			matchedText: slice,
			from: { line: cur.line, ch: start },
			to: { line: cur.line, ch: end },
		};
		if (cur.ch >= start && cur.ch <= end) return hit;
		if (!firstHit) firstHit = hit;
	}
	return firstHit;
}
