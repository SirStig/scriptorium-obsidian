import { ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { formatReferenceHuman, parseReference } from "../reference/parser";
import { findRefAtCursor } from "../editor/cursor-ref";
import { lookupCrossRefs } from "../study/cross-refs-data";
import { toNumericOsisString } from "../reference/osis";
import { totalChaptersForBook } from "../reference/verse-limits";
import { getBookByOsis } from "../reference/books";
import { isPhone } from "../util/platform";
import type { ParsedReference, PassageSegment } from "../reference/types";
import type ScriptoriumPlugin from "../main";

export const PASSAGE_VIEW_TYPE = "scriptorium-passage-pane";

export class PassagePaneView extends ItemView {
	private chromeEl!: HTMLDivElement;
	private titleEl!: HTMLHeadingElement;
	private bodyEl!: HTMLPreElement;
	private crossRefsEl!: HTMLDivElement;
	private backlinksEl!: HTMLDivElement;
	private pinBtn!: HTMLButtonElement;
	private prevBtn!: HTMLButtonElement;
	private nextBtn!: HTMLButtonElement;
	private translationBtn!: HTMLButtonElement;
	pinned = false;
	pinnedRef: ParsedReference | null = null;
	private currentSeg: PassageSegment | null = null;
	private resizeObserver: ResizeObserver | null = null;

	constructor(leaf: WorkspaceLeaf, public plugin: ScriptoriumPlugin) {
		super(leaf);
	}

	getViewType(): string { return PASSAGE_VIEW_TYPE; }
	getDisplayText(): string { return "Passage"; }
	getIcon(): string { return "book-open"; }

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("scriptorium-passage-view");
		// Phones get narrow layout unconditionally; on tablets / split panes
		// drive it from observed width so the side-pane variant renders the
		// same on a 320px-wide drawer as a phone.
		if (isPhone()) this.contentEl.addClass("is-narrow");
		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const w = entry.contentRect.width;
				this.contentEl.classList.toggle("is-narrow", w < 360);
			}
		});
		this.resizeObserver.observe(this.contentEl);

		// ── Sticky chrome row ──
		this.chromeEl = this.contentEl.createDiv({ cls: "scriptorium-passage-chrome" });

		const navWrap = this.chromeEl.createDiv({ cls: "scriptorium-passage-nav" });
		this.prevBtn = navWrap.createEl("button", { cls: "scriptorium-passage-navbtn", text: "← prev" });
		this.prevBtn.setAttr("aria-label", "Previous chapter");
		this.prevBtn.addEventListener("click", () => this.stepChapter(-1));
		this.nextBtn = navWrap.createEl("button", { cls: "scriptorium-passage-navbtn", text: "next →" });
		this.nextBtn.setAttr("aria-label", "Next chapter");
		this.nextBtn.addEventListener("click", () => this.stepChapter(1));

		const actionsWrap = this.chromeEl.createDiv({ cls: "scriptorium-passage-chrome-actions" });
		this.translationBtn = actionsWrap.createEl("button", {
			cls: "scriptorium-passage-translation",
			text: this.translationLabel(),
		});
		this.translationBtn.setAttr("aria-label", "Switch translation");
		this.translationBtn.addEventListener("click", () => {
			(this.app as unknown as { commands: { executeCommandById: (id: string) => void } })
				.commands.executeCommandById("scriptorium:scriptorium-switch-translation");
		});

		this.pinBtn = actionsWrap.createEl("button", { cls: "scriptorium-passage-pin", text: "Pin" });
		this.pinBtn.setAttr("aria-pressed", "false");
		this.pinBtn.addEventListener("click", () => this.togglePin());

		// ── Title + body ──
		this.titleEl = this.contentEl.createEl("h3", { cls: "scriptorium-passage-title" });
		this.bodyEl = this.contentEl.createEl("pre", { cls: "scriptorium-passage-body" });

		// ── Cross-refs ──
		this.crossRefsEl = this.contentEl.createDiv({ cls: "scriptorium-passage-crossrefs" });

		// ── Backlinks ──
		this.backlinksEl = this.contentEl.createDiv({ cls: "scriptorium-passage-backlinks" });

		await this.refresh();
	}

	private translationLabel(): string {
		const s = this.plugin.settings;
		switch (s.textProvider) {
			case "free_bible": return (s.freeBibleTranslation || "WEB").toUpperCase();
			case "esv": return "ESV";
			case "api_bible": return s.apiBibleTranslation ? "API.Bible" : "API.Bible (no id)";
			case "vault_folder": return "Vault";
			default: return "Refs only";
		}
	}

	private isVisible(): boolean {
		const el = this.containerEl;
		if (!el?.isConnected) return false;
		const rect = el.getBoundingClientRect();
		return rect.width > 0 && rect.height > 0;
	}

	private setPinChrome(): void {
		if (this.pinned) {
			this.pinBtn.setText("Pinned");
			this.pinBtn.setAttr("aria-pressed", "true");
			this.pinBtn.setAttr("title", "Click to unpin");
			return;
		}
		this.pinBtn.setText("Pin");
		this.pinBtn.setAttr("aria-pressed", "false");
		this.pinBtn.removeAttribute("title");
	}

	private togglePin(): void {
		if (this.pinned) {
			this.pinned = false;
			this.pinnedRef = null;
			this.setPinChrome();
			void this.refresh();
			new Notice("Passage pane unpinned");
			return;
		}
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view?.getMode() === "preview") {
			const rp = this.plugin.readingPassageRef;
			if (!rp?.segments[0]) {
				new Notice("Click a scripture reference in reading view to pin it");
				return;
			}
			this.pinned = true;
			this.pinnedRef = rp;
			this.setPinChrome();
			void this.refresh();
			return;
		}
		const editor = view?.editor;
		const hit = editor ? findRefAtCursor(editor) : null;
		if (!hit) {
			new Notice("No reference under cursor to pin");
			return;
		}
		this.pinned = true;
		this.pinnedRef = hit.parsed;
		this.setPinChrome();
		void this.refresh();
	}

	private stepChapter(delta: 1 | -1): void {
		const seg = this.currentSeg;
		if (!seg) return;
		const total = totalChaptersForBook(seg.bookOsis);
		const next = seg.chapter + delta;
		if (next < 1 || next > total) return;
		const nextRef = parseReference(`${getBookByOsis(seg.bookOsis)?.name ?? seg.bookOsis} ${next}`);
		if (!nextRef) return;
		this.pinned = true;
		this.pinnedRef = nextRef;
		this.setPinChrome();
		void this.refresh();
	}

	async refresh(): Promise<void> {
		if (!this.isVisible() && !this.pinned) return;
		this.translationBtn.setText(this.translationLabel());

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);

		let parsed: ParsedReference | null = null;
		if (this.pinned && this.pinnedRef) {
			parsed = this.pinnedRef;
		} else if (view?.getMode() === "preview") {
			parsed = this.plugin.readingPassageRef;
		} else {
			const editor = view?.editor;
			if (editor) {
				const hit = findRefAtCursor(editor);
				parsed = hit?.parsed ?? null;
			}
		}

		if (!parsed?.segments[0]) {
			this.titleEl.setText("");
			const empty =
				this.pinned
					? "(Pinned passage cleared)"
					: view?.getMode() === "preview"
						? "Click a scripture reference in this note to preview it here."
						: "No reference at cursor.";
			this.bodyEl.setText(empty);
			this.crossRefsEl.empty();
			this.backlinksEl.empty();
			this.currentSeg = null;
			return;
		}

		const seg = parsed.segments[0];
		this.currentSeg = seg;
		this.titleEl.setText(formatReferenceHuman(parsed.segments));

		const prov = this.plugin.pickProvider();
		const text = (await prov.getPassage(seg))?.text;
		this.bodyEl.setText(text ?? "(No preview text — configure a text provider or add vault text.)");

		// Cross-refs
		this.renderCrossRefs(seg);
		// Backlinks
		this.renderBacklinks(seg);
	}

	private renderCrossRefs(seg: PassageSegment): void {
		this.crossRefsEl.empty();
		if (!this.plugin.settings.crossRefsInPane) return;
		const verseKey = toNumericOsisString([seg]);
		const refs = lookupCrossRefs(verseKey, 8);
		if (refs.length === 0) return;

		const head = this.crossRefsEl.createDiv({ cls: "scriptorium-passage-secthead" });
		head.setText(`See also (${refs.length})`);

		const list = this.crossRefsEl.createDiv({ cls: "scriptorium-passage-crossref-list" });
		for (const ref of refs) {
			const parsed = parseReference(ref);
			if (!parsed?.segments[0]) continue;
			const label = formatReferenceHuman(parsed.segments);
			const a = list.createEl("a", { cls: "scriptorium-passage-crossref", text: label });
			a.href = "#";
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				this.pinned = true;
				this.pinnedRef = parsed;
				this.setPinChrome();
				void this.refresh();
			});
		}
	}

	private renderBacklinks(seg: PassageSegment): void {
		this.backlinksEl.empty();
		if (!this.plugin.settings.backlinksInPane) return;

		const matches: TFile[] = [];
		const targetBook = seg.bookOsis;
		const targetChapter = seg.chapter;
		const allFiles = this.app.vault.getMarkdownFiles();
		for (const f of allFiles) {
			if (matches.length >= 20) break;
			const cache = this.app.metadataCache.getFileCache(f);
			const fm = cache?.frontmatter as Record<string, unknown> | undefined;
			let hit = false;

			// Check passages_resolved (canonical OSIS keys).
			const resolved = fm?.passages_resolved;
			if (Array.isArray(resolved)) {
				for (const r of resolved) {
					if (typeof r !== "string") continue;
					if (r.startsWith(`${targetBook}.${targetChapter}`)) { hit = true; break; }
				}
			}
			// Frontmatter osis/book/chapter shape (hub notes)
			if (!hit && fm?.osis === targetBook && Number(fm?.chapter) === targetChapter) hit = true;
			// Plain passages: list — try parsing each entry
			if (!hit && Array.isArray(fm?.passages)) {
				for (const p of fm.passages) {
					if (typeof p !== "string") continue;
					const parsed = parseReference(p);
					if (parsed?.segments.some((s) => s.bookOsis === targetBook && s.chapter === targetChapter)) {
						hit = true;
						break;
					}
				}
			}

			if (hit) matches.push(f);
		}

		if (matches.length === 0) return;
		const head = this.backlinksEl.createDiv({ cls: "scriptorium-passage-secthead" });
		head.setText(`Notes citing this chapter (${matches.length})`);

		const list = this.backlinksEl.createEl("ul", { cls: "scriptorium-passage-backlink-list" });
		for (const f of matches) {
			const li = list.createEl("li");
			const a = li.createEl("a", { cls: "scriptorium-passage-backlink", text: f.basename });
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				void this.app.workspace.openLinkText(f.path, "", false);
			});
		}
	}

	async onClose(): Promise<void> {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.contentEl.empty();
	}
}
