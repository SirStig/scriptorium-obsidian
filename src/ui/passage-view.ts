import { ItemView, MarkdownView, WorkspaceLeaf } from "obsidian";
import { parseReference, formatReferenceHuman } from "../reference/parser";
import type ScriptoriumPlugin from "../main";

export const PASSAGE_VIEW_TYPE = "scriptorium-passage-pane";

export class PassagePaneView extends ItemView {
	titleEl!: HTMLHeadingElement;
	bodyEl!: HTMLPreElement;

	constructor(leaf: WorkspaceLeaf, public plugin: ScriptoriumPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return PASSAGE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Passage";
	}

	getIcon(): string {
		return "book-open";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("scriptorium-passage-view");
		this.contentEl.createDiv({
			cls: "scriptorium-passage-help",
			text: "Cursor reference or command: Refresh passage pane.",
		});
		this.titleEl = this.contentEl.createEl("h3", { cls: "scriptorium-passage-title" });
		this.bodyEl = this.contentEl.createEl("pre", { cls: "scriptorium-passage-body" });
		this.bodyEl.style.whiteSpace = "pre-wrap";
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		if (!editor) {
			this.titleEl.setText("");
			this.bodyEl.setText("");
			return;
		}
		const line = editor.getLine(editor.getCursor().line);
		const sel = editor.getSelection();
		let p = parseReference((sel || line).trim());
		if (!p) {
			const m = line.match(
				/\b((?:[1-3]\s+)?[A-Za-z][A-Za-z'.]*(?:\s+[A-Za-z][A-Za-z'.]*){0,3}\s+\d+\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)\b/
			);
			if (m) p = parseReference(m[0]!);
		}
		if (!p?.segments[0]) {
			this.titleEl.setText("");
			this.bodyEl.setText("No reference at cursor.");
			return;
		}
		this.titleEl.setText(formatReferenceHuman(p.segments));
		const seg = p.segments[0]!;
		const prov = this.plugin.pickProvider();
		const text = (await prov.getPassage(seg))?.text;
		this.bodyEl.setText(text ?? "(No preview text — configure a text provider or add vault text.)");
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
