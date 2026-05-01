import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
	MarkdownView,
	Notice,
} from "obsidian";
import { parseReference, formatReferenceHuman } from "../reference/parser";
import { fuzzyBooks } from "../reference/fuzzy";
import { inlineRefRegex } from "../reference/regex";
import type { ParsedReference } from "../reference/types";
import { openExternalApp, buildBibliaWebUrl, buildOliveTreeUrl, buildYouVersionUrl, buildAccordanceUrl } from "../handoff/urls";
import type ScriptoriumPlugin from "../main";
import { ensureHubNote } from "../vault/hub";

export type SuggestionValue =
	| { kind: "book"; display: string; insertText: string }
	| { kind: "ref"; parsed: ParsedReference; insertText: string; label: string }
	| { kind: "ambient"; parsed: ParsedReference; insertText: string; label: string };

export class ReferenceSuggest extends EditorSuggest<SuggestionValue> {
	constructor(app: App, public plugin: ScriptoriumPlugin) {
		super(app);
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile | null
	): EditorSuggestTriggerInfo | null {
		const trigger = this.plugin.settings.suggestTrigger;
		const line = editor.getLine(cursor.line);
		const before = line.slice(0, cursor.ch);

		if (trigger) {
			const idx = before.lastIndexOf(trigger);
			if (idx !== -1) {
				const prev = idx > 0 ? before[idx - 1] : undefined;
				if (idx === 0 || prev === " " || prev === "\t") {
					const from = idx + trigger.length;
					return {
						start: { line: cursor.line, ch: idx },
						end: cursor,
						query: before.slice(from),
					};
				}
			}
		}

		if (this.plugin.settings.ambientSuggest) {
			const tail = matchTrailingRef(before);
			if (tail) {
				return {
					start: { line: cursor.line, ch: tail.start },
					end: cursor,
					query: `~ambient~${tail.text}`,
				};
			}
		}

		return null;
	}

	getSuggestions(context: EditorSuggestContext): SuggestionValue[] {
		const raw = context.query;
		if (raw.startsWith("~ambient~")) {
			const slice = raw.slice("~ambient~".length);
			const parsed = parseReference(slice);
			if (!parsed) return [];
			const label = formatReferenceHuman(parsed.segments);
			return [
				{
					kind: "ambient",
					parsed,
					label,
					insertText: this.buildInsert(label, parsed),
				},
			];
		}

		const q = raw.trim();
		if (!q) {
			return fuzzyBooks("", 15).map((m) => ({
				kind: "book",
				display: `${m.book.name} (${m.book.osis})`,
				insertText: `${m.book.name} `,
			}));
		}
		const parsed = parseReference(q);
		if (parsed && parsed.human) {
			const label = formatReferenceHuman(parsed.segments);
			return [
				{
					kind: "ref",
					parsed,
					label,
					insertText: this.buildInsert(label, parsed),
				},
			];
		}
		const bookQuery = q.split(/\d/)[0]?.trim() ?? q;
		return fuzzyBooks(bookQuery, 15).map((m) => ({
			kind: "book",
			display: `${m.book.name} (${m.book.osis})`,
			insertText: `${m.book.name} `,
		}));
	}

	private buildInsert(label: string, parsed: ParsedReference): string {
		const seg = parsed.segments[0]!;
		const app = this.plugin.settings.openApp;
		const ho = this.plugin.handoffOpts();
		if (app === "olivetree") {
			return `[${label}](${buildOliveTreeUrl(this.plugin.settings.olivetreeScheme, seg)})`;
		}
		if (app === "biblia_web") {
			return `[${label}](${buildBibliaWebUrl(this.plugin.settings.bibliaTranslation, seg)})`;
		}
		if (app === "youversion") {
			return `[${label}](${buildYouVersionUrl(this.plugin.settings.youVersionBibleId, seg)})`;
		}
		if (app === "accordance") {
			return `[${label}](${buildAccordanceUrl(seg)})`;
		}
		if (app !== "none" && openExternalApp(app, ho, seg)) {
			return `[${label}](${openExternalApp(app, ho, seg)})`;
		}
		return label;
	}

	renderSuggestion(value: SuggestionValue, el: HTMLElement): void {
		if (value.kind === "book") {
			el.createDiv({ text: value.display });
			return;
		}
		el.createDiv({ text: value.label });
		const sub = el.createEl("small");
		sub.setText(value.kind === "ambient" ? "Linkify reference (ambient)" : "Insert linked reference");
	}

	selectSuggestion(value: SuggestionValue, _evt: MouseEvent | KeyboardEvent): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		const ctx = this.context;
		if (!editor || !ctx) return;

		if (value.kind === "book") {
			editor.replaceRange(value.insertText, ctx.start, ctx.end);
			if (this.plugin.settings.suggestAriaHints) {
				const live = document.getElementById("scriptorium-aria-live");
				if (live) live.textContent = `Selected book ${value.display}`;
			}
			return;
		}

		const tail = value.kind === "ambient" ? "" : " ";
		editor.replaceRange(value.insertText + tail, ctx.start, ctx.end);
		if (this.plugin.settings.openApp === "logos_uri") {
			void ensureHubNote(
				this.app,
				this.plugin.settings.hubFolder,
				this.plugin.settings.hubPerChapter,
				value.parsed.segments[0]!
			).then((f) => {
				new Notice(`Hub note: ${f.path}`);
			});
		}
		if (this.plugin.settings.suggestAriaHints) {
			const live = document.getElementById("scriptorium-aria-live");
			if (live) live.textContent = value.label;
		}
	}
}

/**
 * Find the longest valid reference at the end of `before`. The match must end
 * exactly at the cursor (no trailing chars), so we don't fire on every keystroke.
 */
function matchTrailingRef(before: string): { start: number; text: string } | null {
	const re = inlineRefRegex("g");
	let last: { start: number; end: number; text: string } | null = null;
	let m: RegExpExecArray | null;
	while ((m = re.exec(before)) !== null) {
		const slice = m[1]!;
		last = { start: m.index, end: m.index + slice.length, text: slice };
	}
	if (!last) return null;
	if (last.end !== before.length) return null;
	if (!parseReference(last.text)) return null;
	return { start: last.start, text: last.text };
}
