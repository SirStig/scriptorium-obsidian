import { ItemView, MarkdownView, Notice, WorkspaceLeaf } from "obsidian";
import { formatReferenceHuman } from "../reference/parser";
import { findRefAtCursor } from "../editor/cursor-ref";
import type { ParsedReference } from "../reference/types";
import type ScriptoriumPlugin from "../main";

export const PASSAGE_VIEW_TYPE = "scriptorium-passage-pane";

export class PassagePaneView extends ItemView {
	titleEl!: HTMLHeadingElement;
	bodyEl!: HTMLPreElement;
	pinBtn!: HTMLButtonElement;
	pinned = false;
	pinnedRef: ParsedReference | null = null;

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

		const header = this.contentEl.createDiv({ cls: "scriptorium-passage-header" });
		header.createDiv({
			cls: "scriptorium-passage-help",
			text: "Cursor reference or command: Refresh passage pane.",
		});
		this.pinBtn = header.createEl("button", {
			cls: "scriptorium-passage-pin",
			text: "Pin",
		});
		this.pinBtn.setAttr("aria-pressed", "false");
		this.pinBtn.addEventListener("click", () => this.togglePin());

		this.titleEl = this.contentEl.createEl("h3", { cls: "scriptorium-passage-title" });
		this.bodyEl = this.contentEl.createEl("pre", { cls: "scriptorium-passage-body" });
		this.bodyEl.style.whiteSpace = "pre-wrap";
		await this.refresh();
	}

	private isVisible(): boolean {
		const el = this.containerEl;
		if (!el) return false;
		if (!el.isConnected) return false;
		const rect = el.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	private togglePin(): void {
		if (this.pinned) {
			this.pinned = false;
			this.pinnedRef = null;
			this.pinBtn.setText("Pin");
			this.pinBtn.setAttr("aria-pressed", "false");
			void this.refresh();
			new Notice("Passage pane unpinned");
			return;
		}
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		const hit = editor ? findRefAtCursor(editor) : null;
		if (!hit) {
			new Notice("No reference under cursor to pin");
			return;
		}
		this.pinned = true;
		this.pinnedRef = hit.parsed;
		this.pinBtn.setText("Pinned · click to unpin");
		this.pinBtn.setAttr("aria-pressed", "true");
		void this.refresh();
	}

	async refresh(): Promise<void> {
		if (!this.isVisible() && !this.pinned) return;

		let parsed: ParsedReference | null = null;
		if (this.pinned && this.pinnedRef) {
			parsed = this.pinnedRef;
		} else {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			const editor = view?.editor;
			if (editor) {
				const hit = findRefAtCursor(editor);
				parsed = hit?.parsed ?? null;
			}
		}

		if (!parsed?.segments[0]) {
			this.titleEl.setText("");
			this.bodyEl.setText(this.pinned ? "(Pinned passage cleared)" : "No reference at cursor.");
			return;
		}
		this.titleEl.setText(formatReferenceHuman(parsed.segments));
		const seg = parsed.segments[0]!;
		const prov = this.plugin.pickProvider();
		const text = (await prov.getPassage(seg))?.text;
		this.bodyEl.setText(text ?? "(No preview text — configure a text provider or add vault text.)");
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}
}
