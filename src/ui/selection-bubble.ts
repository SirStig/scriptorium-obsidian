import { Menu, MarkdownView, Notice } from "obsidian";
import { parseReference, formatReferenceHuman } from "../reference/parser";
import { matchBookPrefix } from "../reference/fuzzy";
import { inlineRefRegex } from "../reference/regex";
import { toNumericOsisString } from "../reference/osis";
import { linkRefsInMarkdown } from "../vault/link-refs";
import { ensureHubNote } from "../vault/hub";
import { buildRefMenu } from "./ref-menu";
import type { ParsedReference } from "../reference/types";
import type ScriptoriumPlugin from "../main";

/**
 * A small floating action bar that appears when the user selects text
 * containing a parseable scripture reference. Reuses ref-menu actions in a
 * compact button-strip form. Always shows action options — even with no text
 * provider configured, the user can still open externally, copy OSIS, etc.
 */
export class SelectionBubble {
	private el: HTMLElement | null = null;
	private timer = 0;
	private cleanups: (() => void)[] = [];

	constructor(private plugin: ScriptoriumPlugin) {}

	attach(): void {
		const onSel = (): void => {
			window.clearTimeout(this.timer);
			this.timer = window.setTimeout(() => this.refresh(), 80);
		};
		const onMouseDown = (e: MouseEvent): void => {
			if (this.el && !this.el.contains(e.target as Node)) {
				this.hide();
			}
		};
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === "Escape") this.hide();
		};
		document.addEventListener("selectionchange", onSel);
		document.addEventListener("mousedown", onMouseDown, true);
		document.addEventListener("keydown", onKey);
		this.cleanups.push(() => document.removeEventListener("selectionchange", onSel));
		this.cleanups.push(() => document.removeEventListener("mousedown", onMouseDown, true));
		this.cleanups.push(() => document.removeEventListener("keydown", onKey));
	}

	detach(): void {
		window.clearTimeout(this.timer);
		this.hide();
		for (const c of this.cleanups) c();
		this.cleanups = [];
	}

	private hide(): void {
		if (this.el) {
			this.el.remove();
			this.el = null;
		}
	}

	private refresh(): void {
		if (!this.plugin.settings.selectionBubble) {
			this.hide();
			return;
		}
		const sel = window.getSelection();
		if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
			this.hide();
			return;
		}
		const text = sel.toString();
		if (!text || text.length > 200) {
			this.hide();
			return;
		}

		// Selection must be inside the active markdown editor's content area.
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			this.hide();
			return;
		}
		const range = sel.getRangeAt(0);
		const container = range.commonAncestorContainer;
		const editorEl = view.contentEl;
		if (!editorEl.contains(container.nodeType === Node.TEXT_NODE ? container.parentNode : container)) {
			this.hide();
			return;
		}

		const found = findRefInString(text);
		if (!found) {
			this.hide();
			return;
		}

		const rect = range.getBoundingClientRect();
		this.show(rect, found.parsed, found.matchedText);
	}

	private show(rect: DOMRect, parsed: ParsedReference, matchedText: string): void {
		this.hide();
		const el = document.createElement("div");
		el.className = "scriptorium-selection-bubble";
		el.setAttribute("role", "toolbar");
		el.setAttribute("aria-label", `Actions for ${formatReferenceHuman(parsed.segments)}`);
		el.style.position = "fixed";
		el.style.zIndex = "9999";

		const seg = parsed.segments[0]!;
		const editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;

		const btn = (label: string, title: string, icon: string, onClick: () => void): HTMLButtonElement => {
			const b = document.createElement("button");
			b.className = "scriptorium-selection-btn";
			b.title = title;
			b.setAttribute("aria-label", title);
			b.dataset.icon = icon;
			b.textContent = label;
			b.addEventListener("click", (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				onClick();
				this.hide();
			});
			el.appendChild(b);
			return b;
		};

		btn("Open", `Open in ${this.plugin.settings.openApp}`, "external-link", () => {
			this.plugin.openParsed(parsed);
		});

		btn("Hub", "Open or create hub note", "book-open", () => {
			void ensureHubNote(
				this.plugin.app,
				this.plugin.settings.hubFolder,
				this.plugin.settings.hubPerChapter,
				seg
			).then((f) => this.plugin.app.workspace.openLinkText(f.path, "", true));
		});

		btn("OSIS", "Copy OSIS id", "copy", () => {
			void navigator.clipboard.writeText(toNumericOsisString(parsed.segments));
			new Notice("Copied OSIS id");
		});

		if (editor) {
			btn("Wikilink", "Convert to hub wikilink", "link", () => {
				const sel = window.getSelection();
				if (!sel || sel.rangeCount === 0) return;
				const next = linkRefsInMarkdown(matchedText, this.plugin.settings.hubFolder, this.plugin.settings.hubPerChapter);
				if (next === matchedText) return;
				editor.replaceSelection(next);
			});

			btn("Insert text", "Insert verse text below", "file-text", async () => {
				const r = await this.plugin.pickProvider().getPassage(seg);
				if (!r?.text) {
					new Notice("No text from current provider — switch to Free Bible API in settings.");
					return;
				}
				const lines = r.text.split(/\r?\n/).map((l) => `> ${l}`).join("\n");
				const attribution = r.attribution ? `\n> — ${r.attribution}` : "";
				const cursor = editor.getCursor("to");
				editor.replaceRange(`\n${lines}${attribution}\n`, cursor);
			});
		}

		btn("⋯", "More actions", "more-horizontal", () => {
			const menu = new Menu();
			buildRefMenu(menu, {
				plugin: this.plugin,
				parsed,
				matchedText,
				editorReplace: editor ? (text) => editor.replaceSelection(text) : undefined,
			});
			const r = el.getBoundingClientRect();
			menu.showAtPosition({ x: r.left, y: r.bottom + 4 });
		});

		document.body.appendChild(el);
		this.el = el;

		// Position: prefer above the selection rect; fall back to below if no room.
		const margin = 6;
		const er = el.getBoundingClientRect();
		let top = rect.top - er.height - margin;
		if (top < margin) top = rect.bottom + margin;
		let left = rect.left + rect.width / 2 - er.width / 2;
		if (left < margin) left = margin;
		if (left + er.width > window.innerWidth - margin) {
			left = window.innerWidth - er.width - margin;
		}
		el.style.top = `${Math.round(top)}px`;
		el.style.left = `${Math.round(left)}px`;
	}
}

function findRefInString(s: string): { parsed: ParsedReference; matchedText: string } | null {
	const direct = parseReference(s.trim());
	if (direct) return { parsed: direct, matchedText: s.trim() };
	const re = inlineRefRegex("g");
	let m: RegExpExecArray | null;
	while ((m = re.exec(s)) !== null) {
		const slice = m[1]!;
		const book = matchBookPrefix(slice);
		if (!book) continue;
		const trueSlice = slice.slice(book.start);
		const p = parseReference(trueSlice);
		if (p?.segments[0]) return { parsed: p, matchedText: trueSlice };
	}
	return null;
}
