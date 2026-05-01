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
import type { ParsedReference } from "../reference/types";
import { openExternalApp, buildBibliaWebUrl, buildOliveTreeUrl, buildYouVersionUrl, buildAccordanceUrl } from "../handoff/urls";
import type ScriptoriumPlugin from "../main";
import { ensureHubNote } from "../vault/hub";

export type SuggestionValue =
	| { kind: "book"; display: string; insertText: string }
	| { kind: "ref"; parsed: ParsedReference; insertText: string; label: string };

export class ReferenceSuggest extends EditorSuggest<SuggestionValue> {
	constructor(app: App, public plugin: ScriptoriumPlugin) {
		super(app);
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null
	): EditorSuggestTriggerInfo | null {
		const trigger = this.plugin.settings.suggestTrigger;
		if (!trigger) return null;
		const line = editor.getLine(cursor.line);
		const before = line.slice(0, cursor.ch);
		const idx = before.lastIndexOf(trigger);
		if (idx === -1) return null;
		if (idx > 0) {
			const prev = before[idx - 1];
			if (prev !== " " && prev !== "\t") return null;
		}
		const from = idx + trigger.length;
		const query = before.slice(from);
		return {
			start: { line: cursor.line, ch: idx },
			end: cursor,
			query,
		};
	}

	getSuggestions(context: EditorSuggestContext): SuggestionValue[] {
		const q = context.query.trim();
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
		sub.setText("Insert linked reference");
	}

	selectSuggestion(value: SuggestionValue, _evt: MouseEvent | KeyboardEvent): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		if (!editor) return;
		if (value.kind === "book") {
			const cursor = editor.getCursor();
			const line = editor.getLine(cursor.line);
			const trigger = this.plugin.settings.suggestTrigger;
			const before = line.slice(0, cursor.ch);
			const idx = before.lastIndexOf(trigger);
			if (idx === -1) return;
			const from = idx + trigger.length;
			editor.replaceRange(value.insertText, { line: cursor.line, ch: from }, cursor);
			if (this.plugin.settings.suggestAriaHints) {
				const live = document.getElementById("scriptorium-aria-live");
				if (live) live.textContent = `Selected book ${value.display}`;
			}
			return;
		}
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		const trigger = this.plugin.settings.suggestTrigger;
		const before = line.slice(0, cursor.ch);
		const idx = before.lastIndexOf(trigger);
		if (idx === -1) return;
		editor.replaceRange(value.insertText + " ", { line: cursor.line, ch: idx }, cursor);
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
