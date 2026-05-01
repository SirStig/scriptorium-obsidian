import type { Editor } from "obsidian";
import { LOGOS_URI_PATTERN } from "./urls";
import { linkRefsInMarkdown } from "../vault/link-refs";

export function normalizePastedText(text: string, enabled: boolean): string {
	if (!enabled) return text;
	return text.replace(LOGOS_URI_PATTERN, (uri) => {
		const label = "Logos link";
		return `[${label}](${uri})`;
	});
}

export function linkifyPastedText(text: string, hubFolder: string, perChapter: boolean): string {
	return linkRefsInMarkdown(text, hubFolder, perChapter);
}

export function stripAndNormalizeOnPaste(editor: Editor, text: string, enabled: boolean): boolean {
	const next = normalizePastedText(text, enabled);
	if (next === text) return false;
	const sel = editor.getSelection();
	if (sel) {
		editor.replaceSelection(next);
	} else {
		editor.replaceRange(next, editor.getCursor());
	}
	return true;
}
