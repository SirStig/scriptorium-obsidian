import {
	Notice,
	Plugin,
	Editor,
	TFile,
	SuggestModal,
	App,
} from "obsidian";
import { DEFAULT_SETTINGS, ScriptoriumSettingTab, type ScriptoriumSettings } from "./settings";
import { ReferenceSuggest } from "./editor/reference-suggest";
import { createRefHighlightPlugin } from "./editor/cm-decorations";
import { findRefAtCursor } from "./editor/cursor-ref";
import { buildRefMenu } from "./ui/ref-menu";
import { SelectionBubble } from "./ui/selection-bubble";
import { RefHoverDelegate } from "./ui/hover-delegate";
import { BiblePickerModal } from "./ui/bible-picker";
import { StudyNoteCreateModal } from "./studio/create-modal";
import { exportToSlides } from "./studio/slide-export";
import { indexPassagesInFrontmatter } from "./studio/index-passages";
import { outlineToMermaid } from "./studio/mermaid-outline";
import { registerReadingModeProcessors } from "./reading/postprocess";
import { parseReference } from "./reference/parser";
import type { ParsedReference } from "./reference/types";
import { toNumericOsisString } from "./reference/osis";
import { configureCanon } from "./reference/books";
import { setOsisCompactExtras } from "./reference/osis";
import { openExternalApp, LOGOS_URI_PATTERN } from "./handoff/urls";
import { openUrlExternally } from "./handoff/open-external";
import type { HandoffOpts } from "./handoff/types";
import { normalizePastedText, linkifyPastedText } from "./handoff/paste";
import { NoneTextProvider, type TextProvider } from "./providers/types";
import { VaultFolderTextProvider } from "./providers/vault-provider";
import { ApiBibleTextProvider } from "./providers/api-provider";
import { FreeBibleProvider } from "./providers/free-provider";
import { EsvTextProvider } from "./providers/esv-provider";
import { pickTextProvider } from "./providers/registry";
import { PersistentTextCache, CACHE_VERSION } from "./providers/cache";
import { PassagePaneView, PASSAGE_VIEW_TYPE } from "./ui/passage-view";
import { parseLectionaryCsv, rowForDate, type LectionaryRow } from "./pedagogy/lectionary";
import { getActivePericopes, setUserPericopes, type PericopeEntry } from "./pedagogy/pericopes";
import { openGreekPicker, openHebrewPicker } from "./study/greek-insert";
import { setUserStrongs, type StrongsEntry } from "./study/strongs-data";
import {
	downloadStrongs,
	loadDownloadedStrongs,
	clearDownloadedStrongs,
} from "./study/strongs-online";
import { fetchVerseOfTheDay, showVerseOfDayNotice, type VerseOfDay } from "./study/verse-of-day";
import { setUserCrossRefs } from "./study/cross-refs-data";
import type { Extension } from "@codemirror/state";
import { ensureHubNote } from "./vault/hub";
import { linkRefsInMarkdown } from "./vault/link-refs";

export default class ScriptoriumPlugin extends Plugin {
	settings: ScriptoriumSettings = DEFAULT_SETTINGS;
	suggest!: ReferenceSuggest;
	cmExtras: Extension[] = [];
	noneProvider = new NoneTextProvider();
	vaultProvider: VaultFolderTextProvider | null = null;
	freeProvider: FreeBibleProvider | null = null;
	apiProvider: ApiBibleTextProvider | null = null;
	esvProvider: EsvTextProvider | null = null;
	apiResponseCache: PersistentTextCache = new PersistentTextCache(
		(entries) => this.persistCache(entries)
	);
	lectionaryRows: LectionaryRow[] = [];
	ribbonEl: HTMLElement | null = null;
	statusBarEl: HTMLElement | null = null;
	vodStatusEl: HTMLElement | null = null;
	selectionBubble: SelectionBubble | null = null;
	hoverDelegate: RefHoverDelegate | null = null;
	studyNoteRibbonEl: HTMLElement | null = null;

	/** Preview/reading mode: last ref the user clicked or opened; drives the passage pane when not pinned. */
	readingPassageRef: ParsedReference | null = null;
	private passagePaneRefreshTimer = 0;
	private editorPassageTimer = 0;

	/** Call when the user activates a ref in reading/preview (click, context menu, touch popover). */
	noteReadingPassageRef(parsed: ParsedReference): void {
		this.readingPassageRef = parsed;
		this.schedulePassagePaneRefresh();
	}

	schedulePassagePaneRefresh(): void {
		window.clearTimeout(this.passagePaneRefreshTimer);
		this.passagePaneRefreshTimer = window.setTimeout(() => {
			const leaves = this.app.workspace.getLeavesOfType(PASSAGE_VIEW_TYPE);
			const v = leaves[0]?.view;
			if (v instanceof PassagePaneView) void v.refresh();
		}, 100);
	}

	reconcileSuggestTrigger(v: string): void {
		const t = v.trim();
		if (!t) {
			this.settings.suggestTrigger = "/ref";
			return;
		}
		this.settings.suggestTrigger = t.startsWith("/") ? t : `/${t}`;
	}

	handoffOpts(): HandoffOpts {
		return {
			scheme: this.settings.olivetreeScheme,
			translation: this.settings.bibliaTranslation,
			youVersionId: this.settings.youVersionBibleId,
			logosResourceAlias: this.settings.logosResourceAlias,
			logosRefPrefix: this.settings.logosRefPrefix,
		};
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as
			| (Partial<ScriptoriumSettings> & {
					customAliases?: unknown;
					_textCache?: unknown;
			  })
			| undefined;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		if (!this.settings.customAliases || typeof this.settings.customAliases !== "object") {
			this.settings.customAliases = {};
		}
		this.reconcileSuggestTrigger(this.settings.suggestTrigger);
		this.applyCanonAndAliases();
		// Hydrate the persistent text-provider cache.
		this.apiResponseCache.hydrate(data?._textCache);
	}

	private async persistCache(entries: [string, { text: string; attribution?: string }][]): Promise<void> {
		// Co-locate cache with settings under a reserved key. saveData replaces
		// the entire payload, so we must save settings + cache together.
		const payload = Object.assign({}, this.settings, {
			_textCache: { v: CACHE_VERSION, entries },
		});
		await this.saveData(payload);
	}

	applyCanonAndAliases(): void {
		configureCanon(this.settings.includeDeuterocanon, this.settings.customAliases);
		setOsisCompactExtras(this.settings.customAliases);
	}

	async saveSettings(): Promise<void> {
		// Co-save current cache snapshot so saveData doesn't trash it.
		const cacheEntries = Array.from(this.apiResponseCache.asMap().entries());
		const payload = Object.assign({}, this.settings, {
			_textCache: { v: CACHE_VERSION, entries: cacheEntries },
		});
		await this.saveData(payload);
		this.refreshProviders();
		this.applyCanonAndAliases();
		this.refreshStatusBar();
	}

	refreshProviders(): void {
		this.vaultProvider = new VaultFolderTextProvider(this.app, this.settings.vaultBibleFolder);
		this.freeProvider = new FreeBibleProvider(
			this.settings.freeBibleTranslation || "web",
			this.settings.allowNetwork,
			this.apiResponseCache
		);
		this.apiProvider = new ApiBibleTextProvider(
			this.settings.apiBibleKey,
			this.settings.apiBibleTranslation,
			this.settings.allowNetwork,
			this.apiResponseCache
		);
		this.esvProvider = new EsvTextProvider(
			this.settings.esvApiKey,
			this.settings.allowNetwork,
			this.apiResponseCache
		);
	}

	pickProvider(): TextProvider {
		const mode = this.settings.textProvider;
		const networkOnly = mode === "api_bible" || mode === "free_bible" || mode === "esv";
		if (!this.settings.allowNetwork && networkOnly) {
			return this.noneProvider;
		}
		return pickTextProvider(
			this.noneProvider,
			this.vaultProvider,
			this.freeProvider,
			this.apiProvider,
			this.esvProvider,
			this.settings.textProvider
		);
	}

	refreshEditorExtensions(debounceMs?: number): void {
		const ms = debounceMs ?? this.settings.editorHighlightDebounceMs;
		this.cmExtras.length = 0;
		if (this.settings.highlightInlineRefs) {
			this.cmExtras.push(createRefHighlightPlugin(ms, this.settings.colorBookSection));
		}
		this.app.workspace.updateOptions();
	}

	async refreshVerseOfDayWidget(): Promise<void> {
		if (!this.settings.verseOfDay) {
			if (this.vodStatusEl) {
				this.vodStatusEl.remove();
				this.vodStatusEl = null;
			}
			return;
		}
		if (!this.settings.allowNetwork) return;

		if (!this.vodStatusEl) {
			this.vodStatusEl = this.addStatusBarItem();
			this.vodStatusEl.addClass("scriptorium-vod-statusbar");
			this.vodStatusEl.addClass("scriptorium-clickable");
			this.vodStatusEl.addEventListener("click", () => {
				const cached = this.settings.verseOfDayCache;
				if (cached) showVerseOfDayNotice(cached);
			});
			this.vodStatusEl.setText("📖 …");
		}

		const store = {
			get: (): VerseOfDay | null => this.settings.verseOfDayCache,
			set: (v: VerseOfDay): void => {
				this.settings.verseOfDayCache = v;
				void this.saveSettings();
			},
		};
		const v = await fetchVerseOfTheDay(this.settings.freeBibleTranslation || "web", store);
		if (v && this.vodStatusEl) {
			this.vodStatusEl.setText(`📖 ${v.reference}`);
			this.vodStatusEl.setAttr(
				"aria-label",
				`Verse of the day: ${v.reference} (${v.translation.toUpperCase()}). Click to see text.`
			);
		}
	}

	refreshStatusBar(): void {
		if (!this.statusBarEl) return;
		const mode = this.settings.textProvider;
		const provider =
			mode === "vault_folder"
				? "Vault folder"
				: mode === "free_bible"
					? `Free (${(this.settings.freeBibleTranslation || "web").toUpperCase()})`
					: mode === "api_bible"
						? "API.Bible"
						: mode === "esv"
							? "ESV"
							: "Refs only";
		const net = this.settings.allowNetwork ? "online" : "offline";
		const networkBound = mode === "api_bible" || mode === "free_bible" || mode === "esv";
		const showNet = networkBound || !this.settings.allowNetwork;
		this.statusBarEl.setText(`Scriptorium · ${provider}${showNet ? ` · ${net}` : ""}`);
		this.statusBarEl.setAttr(
			"aria-label",
			`Scriptorium text provider ${provider}${showNet ? `, network ${net}` : ""} — click to toggle network`
		);
	}

	refreshRibbon(): void {
		if (this.studyNoteRibbonEl) {
			this.studyNoteRibbonEl.remove();
			this.studyNoteRibbonEl = null;
		}
		if (this.ribbonEl) {
			this.ribbonEl.remove();
			this.ribbonEl = null;
		}
		if (this.settings.showStudyNoteRibbon) {
			this.studyNoteRibbonEl = this.addRibbonIcon("file-plus", "New study note", () => {
				new StudyNoteCreateModal(this.app, this).open();
			});
		}
		if (this.settings.showPassageRibbon) {
			this.ribbonEl = this.addRibbonIcon("book-open", "Scriptorium passage pane", () => {
				void this.activatePassageView();
			});
		}
	}

	async activatePassageView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(PASSAGE_VIEW_TYPE)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
			if (!leaf) {
				new Notice("Could not open passage pane");
				return;
			}
			await leaf.setViewState({ type: PASSAGE_VIEW_TYPE, active: true });
		}
		await workspace.revealLeaf(leaf);
		const v = leaf.view;
		if (v instanceof PassagePaneView) await v.refresh();
	}

	async loadLectionary(): Promise<void> {
		const p = this.settings.lectionaryCsvPath;
		if (!p) {
			this.lectionaryRows = [];
			return;
		}
		const f = this.app.vault.getAbstractFileByPath(p);
		if (!(f instanceof TFile)) {
			this.lectionaryRows = [];
			return;
		}
		const text = await this.app.vault.read(f);
		this.lectionaryRows = parseLectionaryCsv(text);
	}

	async loadCrossRefsFromNote(): Promise<void> {
		const p = this.settings.crossRefsNotePath;
		if (!p) {
			setUserCrossRefs({});
			return;
		}
		const f = this.app.vault.getAbstractFileByPath(p);
		if (!(f instanceof TFile)) {
			setUserCrossRefs({});
			return;
		}
		const text = await this.app.vault.read(f);
		const block = text.match(/```json\s*([\s\S]*?)```/i);
		if (!block?.[1]) {
			setUserCrossRefs({});
			return;
		}
		try {
			const data = JSON.parse(block[1]) as Record<string, string[]>;
			if (data && typeof data === "object" && !Array.isArray(data)) {
				setUserCrossRefs(data);
			}
		} catch {
			new Notice("Could not parse cross-refs JSON");
		}
	}

	async loadStrongsFromNote(): Promise<void> {
		const p = this.settings.strongsNotePath;
		if (!p) {
			setUserStrongs({});
			return;
		}
		const f = this.app.vault.getAbstractFileByPath(p);
		if (!(f instanceof TFile)) {
			setUserStrongs({});
			return;
		}
		const text = await this.app.vault.read(f);
		const block = text.match(/```json\s*([\s\S]*?)```/i);
		if (!block?.[1]) {
			setUserStrongs({});
			return;
		}
		try {
			const data = JSON.parse(block[1]) as {
				greek?: Record<string, StrongsEntry>;
				hebrew?: Record<string, StrongsEntry>;
			};
			setUserStrongs({
				greek: data.greek && typeof data.greek === "object" ? data.greek : undefined,
				hebrew: data.hebrew && typeof data.hebrew === "object" ? data.hebrew : undefined,
			});
		} catch {
			new Notice("Could not parse Strong's extras JSON");
		}
	}

	async loadPericopesFromNote(): Promise<void> {
		const p = this.settings.pericopesNotePath;
		if (!p) {
			setUserPericopes([]);
			return;
		}
		const f = this.app.vault.getAbstractFileByPath(p);
		if (!(f instanceof TFile)) {
			setUserPericopes([]);
			return;
		}
		const text = await this.app.vault.read(f);
		const block = text.match(/```json\s*([\s\S]*?)```/i);
		if (!block?.[1]) {
			setUserPericopes([]);
			return;
		}
		try {
			const data = JSON.parse(block[1]) as PericopeEntry[];
			if (Array.isArray(data)) setUserPericopes(data);
		} catch {
			new Notice("Could not parse pericope pack JSON");
		}
	}

	async loadAliasesFromNote(): Promise<void> {
		const p = this.settings.customAliasesNotePath;
		if (!p) return;
		const f = this.app.vault.getAbstractFileByPath(p);
		if (!(f instanceof TFile)) return;
		const text = await this.app.vault.read(f);
		const fm = this.app.metadataCache.getFileCache(f)?.frontmatter;
		const am = fm?.aliases_map;
		if (am && typeof am === "object" && !Array.isArray(am)) {
			this.settings.customAliases = { ...this.settings.customAliases, ...(am as Record<string, string>) };
		}
		const jsonBlock = text.match(/```json\s*([\s\S]*?)```/i);
		if (jsonBlock?.[1]) {
			try {
				const o = JSON.parse(jsonBlock[1]) as Record<string, string>;
				this.settings.customAliases = { ...this.settings.customAliases, ...o };
			} catch {
				new Notice("Could not parse JSON code block in alias note");
			}
		}
		await this.saveSettings();
	}

	async onload(): Promise<void> {
		this.suggest = new ReferenceSuggest(this.app, this);
		await this.loadSettings();
		await this.loadLectionary();
		await this.loadAliasesFromNote();
		await this.loadPericopesFromNote();
		await this.loadStrongsFromNote();
		await this.loadCrossRefsFromNote();
		// Hydrate downloaded Strong's lexicon if previously fetched.
		await loadDownloadedStrongs(this.app, this);
		this.refreshProviders();
		this.registerEditorExtension(this.cmExtras);
		this.refreshEditorExtensions();
		this.registerEditorSuggest(this.suggest);
		this.addSettingTab(new ScriptoriumSettingTab(this.app, this));
		registerReadingModeProcessors(this);

		this.registerView(PASSAGE_VIEW_TYPE, (leaf) => new PassagePaneView(leaf, this));
		this.refreshRibbon();

		this.selectionBubble = new SelectionBubble(this);
		this.selectionBubble.attach();
		this.register(() => this.selectionBubble?.detach());

		this.hoverDelegate = new RefHoverDelegate(this);
		this.hoverDelegate.attach();
		this.register(() => this.hoverDelegate?.detach());

		void this.refreshVerseOfDayWidget();

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("scriptorium-statusbar");
		this.statusBarEl.addClass("scriptorium-clickable");
		this.statusBarEl.addEventListener("click", () => {
			this.settings.allowNetwork = !this.settings.allowNetwork;
			void this.saveSettings();
			new Notice(
				`Scriptorium network ${this.settings.allowNetwork ? "enabled" : "disabled"}`
			);
		});
		this.refreshStatusBar();

		const aria = document.body.createDiv();
		aria.addClass("scriptorium-sr-only");
		aria.id = "scriptorium-aria-live";
		aria.setAttribute("role", "status");
		aria.setAttribute("aria-live", "polite");
		this.register(() => aria.remove());

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.readingPassageRef = null;
				this.schedulePassagePaneRefresh();
			})
		);
		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				window.clearTimeout(this.editorPassageTimer);
				this.editorPassageTimer = window.setTimeout(() => this.schedulePassagePaneRefresh(), 220);
			})
		);
		this.register(() => {
			window.clearTimeout(this.passagePaneRefreshTimer);
			window.clearTimeout(this.editorPassageTimer);
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) return;
				menu.addSeparator();
				buildRefMenu(menu, {
					plugin: this,
					parsed: hit.parsed,
					matchedText: hit.matchedText,
					editorReplace: (text) => editor.replaceRange(text, hit.from, hit.to),
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("editor-paste", (clipboard: ClipboardEvent, editor: Editor) => {
				if (clipboard.defaultPrevented) return;
				const raw = clipboard.clipboardData?.getData("text/plain");
				if (!raw) return;
				let next = normalizePastedText(raw, this.settings.pasteNormalizeLogos);
				if (this.settings.pasteAutoLinkify) {
					next = linkifyPastedText(next, this.settings.hubFolder, this.settings.hubPerChapter);
				}
				if (next === raw) return;
				clipboard.preventDefault();
				editor.replaceSelection(next);
			})
		);

		this.addCommand({
			id: "open-cursor-ref",
			name: "Open passage under cursor (external)",
			editorCallback: (editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) {
					new Notice("No reference found at cursor");
					return;
				}
				this.openParsed(hit.parsed);
			},
		});

		this.addCommand({
			id: "open-hub",
			name: "Open or create scripture hub note",
			editorCallback: (editor) => {
				void (async () => {
					const hit = findRefAtCursor(editor);
					if (!hit) {
						new Notice("No reference at cursor");
						return;
					}
					const file = await ensureHubNote(
						this.app,
						this.settings.hubFolder,
						this.settings.hubPerChapter,
						hit.parsed.segments[0]!,
						{ allowNetwork: this.settings.allowNetwork }
					);
					await this.app.workspace.openLinkText(file.path, "", true);
				})();
			},
		});

		this.addCommand({
			id: "insert-passage-text",
			name: "Insert passage text at cursor",
			editorCallback: (editor) => {
				void (async () => {
					const hit = findRefAtCursor(editor);
					if (!hit) {
						new Notice("No reference at cursor");
						return;
					}
					const seg = hit.parsed.segments[0]!;
					const provider = this.pickProvider();
					const r = await provider.getPassage(seg);
					if (!r?.text) {
						new Notice("No text from current provider — configure one in Settings.");
						return;
					}
					const lines = r.text.split(/\r?\n/).map((l) => `> ${l}`).join("\n");
					const attribution = r.attribution ? `\n> — ${r.attribution}` : "";
					const block = `\n${lines}${attribution}\n`;
					editor.replaceRange(block, { line: hit.to.line, ch: hit.to.ch });
				})();
			},
		});

		this.addCommand({
			id: "copy-logos-pattern",
			name: "Copy Logos URI selection as Markdown link",
			editorCallback: (editor) => {
				const sel = editor.getSelection();
				if (!sel) {
					new Notice("Select text to copy");
					return;
				}
				if (!LOGOS_URI_PATTERN.test(sel)) {
					new Notice("Selection does not look like a Logos URI");
					return;
				}
				void navigator.clipboard.writeText(`[Logos](${sel.trim()})`);
				new Notice("Copied Markdown link to clipboard");
			},
		});

		this.addCommand({
			id: "copy-osis",
			name: "Copy OSIS-style passage ID",
			editorCallback: (editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) {
					new Notice("No reference found");
					return;
				}
				void navigator.clipboard.writeText(toNumericOsisString(hit.parsed.segments));
				new Notice("Copied passage ID");
			},
		});

		this.addCommand({
			id: "convert-cursor-to-wikilink",
			name: "Convert reference under cursor to hub wikilink",
			editorCallback: (editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) {
					new Notice("No reference at cursor");
					return;
				}
				const next = linkRefsInMarkdown(hit.matchedText, this.settings.hubFolder, this.settings.hubPerChapter);
				if (next === hit.matchedText) {
					new Notice("Nothing to wrap");
					return;
				}
				editor.replaceRange(next, hit.from, hit.to);
			},
		});

		this.addCommand({
			id: "link-refs-in-note",
			name: "Link inline references to hub paths (whole note)",
			editorCheckCallback: (checking, editor, ctx) => {
				const file = ctx.file;
				if (!file) return false;
				if (checking) return true;
				const body = editor.getValue();
				const next = linkRefsInMarkdown(body, this.settings.hubFolder, this.settings.hubPerChapter);
				if (next === body) {
					new Notice("No changes");
					return true;
				}
				editor.setValue(next);
				new Notice("References linked where parsed");
				return true;
			},
		});

		this.addCommand({
			id: "refresh-passage-pane",
			name: "Refresh passage pane",
			callback: () => {
				void this.activatePassageView();
			},
		});

		this.addCommand({
			id: "insert-lectionary-today",
			name: "Insert today’s lectionary readings",
			editorCallback: (editor) => {
				const iso = new Date().toISOString().slice(0, 10);
				const row = rowForDate(this.lectionaryRows, iso);
				if (!row) {
					new Notice("No lectionary row for today — set CSV path and reload Obsidian");
					return;
				}
				editor.replaceSelection(row.refs.join("; ") + "\n");
			},
		});

		this.addCommand({
			id: "insert-pericope",
			name: "Insert built-in pericope parallels",
			editorCallback: (editor) => {
				new PericopePickModal(this.app, (p) => {
					editor.replaceSelection(p.refs.join("\n") + "\n");
				}).open();
			},
		});

		this.addCommand({
			id: "greek-insert",
			name: "Insert Greek character",
			callback: () => openGreekPicker(this.app),
		});

		this.addCommand({
			id: "hebrew-insert",
			name: "Insert Hebrew character / mark",
			callback: () => openHebrewPicker(this.app),
		});

		this.addCommand({
			id: "new-study-note",
			name: "New study note (sermon, inductive, word study, …)",
			callback: () => {
				new StudyNoteCreateModal(this.app, this).open();
			},
		});

		this.addCommand({
			id: "export-slides",
			name: "Export current note as slide outline",
			editorCheckCallback: (checking, editor, ctx) => {
				const file = ctx.file;
				if (!file) return false;
				if (checking) return true;
				const body = editor.getValue();
				const slides = exportToSlides(body, { slideLevel: 2 });
				const dir = file.parent?.path ?? "";
				const stem = file.basename;
				const slidesPath = (dir ? `${dir}/` : "") + `${stem}.slides.md`;
				const existing = this.app.vault.getAbstractFileByPath(slidesPath);
				const promise = existing instanceof TFile
					? this.app.vault.modify(existing, slides)
					: this.app.vault.create(slidesPath, slides);
				void promise.then(() => {
					new Notice(`Wrote ${slidesPath}`);
					void this.app.workspace.openLinkText(slidesPath, "", true);
				});
				return true;
			},
		});

		this.addCommand({
			id: "download-strongs",
			name: "Download full Strong's lexicon (CC0)",
			callback: () => {
				void (async () => {
					if (!this.settings.allowNetwork) {
						new Notice("Network disabled — turn it on in Settings first.");
						return;
					}
					await downloadStrongs(this.app, this);
				})();
			},
		});

		this.addCommand({
			id: "clear-strongs",
			name: "Clear downloaded Strong's data",
			callback: () => {
				void (async () => {
					await clearDownloadedStrongs(this.app, this);
				})();
			},
		});

		this.addCommand({
			id: "insert-mermaid-outline",
			name: "Insert Mermaid outline diagram",
			editorCallback: (editor) => {
				const body = editor.getValue();
				const mermaid = outlineToMermaid(body);
				if (!mermaid) {
					new Notice("No headings found to diagram.");
					return;
				}
				const cursor = editor.getCursor();
				editor.replaceRange(`\n${mermaid}\n`, cursor);
			},
		});

		this.addCommand({
			id: "index-passages",
			name: "Index passages in this note's frontmatter",
			editorCheckCallback: (checking, editor, ctx) => {
				const file = ctx.file;
				if (!file) return false;
				if (checking) return true;
				const body = editor.getValue();
				const next = indexPassagesInFrontmatter(body);
				if (next === null) {
					new Notice("No 'passages:' frontmatter list found.");
					return true;
				}
				if (next === body) {
					new Notice("Passages already indexed.");
					return true;
				}
				editor.setValue(next);
				new Notice("Resolved passages → frontmatter passages_resolved");
				return true;
			},
		});

		this.addCommand({
			id: "switch-translation",
			name: "Switch translation for current provider",
			callback: () => {
				void (async () => {
					const mode = this.settings.textProvider;
					if (mode === "free_bible") {
						const FREE_OPTS = [
							{ id: "web", name: "World English Bible", abbreviation: "WEB", language: "English" },
							{ id: "kjv", name: "King James Version", abbreviation: "KJV", language: "English" },
							{ id: "asv", name: "American Standard Version", abbreviation: "ASV", language: "English" },
							{ id: "bbe", name: "Bible in Basic English", abbreviation: "BBE", language: "English" },
							{ id: "oeb-cw", name: "Open English Bible (Commonwealth)", abbreviation: "OEB-CW", language: "English" },
							{ id: "oeb-us", name: "Open English Bible (US)", abbreviation: "OEB-US", language: "English" },
							{ id: "darby", name: "Darby Bible (1890)", abbreviation: "DARBY", language: "English" },
							{ id: "ylt", name: "Young's Literal Translation", abbreviation: "YLT", language: "English" },
							{ id: "dra", name: "Douay–Rheims American (Catholic)", abbreviation: "DRA", language: "English" },
							{ id: "clementine", name: "Clementine Vulgate", abbreviation: "VULG", language: "Latin" },
						];
						new BiblePickerModal(this.app, FREE_OPTS, (e) => {
							void (async () => {
								this.settings.freeBibleTranslation = e.id;
								await this.saveSettings();
								new Notice(`Free Bible translation: ${e.abbreviation || e.name}`);
							})();
						}).open();
						return;
					}
					if (mode === "api_bible") {
						if (!this.settings.apiBibleKey) {
							new Notice("Set the API.Bible key in Settings first.");
							return;
						}
						const entries = await this.apiProvider?.listBibles();
						if (!entries || entries.length === 0) {
							new Notice("No bibles returned — check key and network.");
							return;
						}
						new BiblePickerModal(this.app, entries, (e) => {
							void (async () => {
								this.settings.apiBibleTranslation = e.id;
								await this.saveSettings();
								new Notice(`API.Bible translation: ${e.abbreviation || e.name}`);
							})();
						}).open();
						return;
					}
					new Notice(
						"Switch translations only supported for Free Bible API and API.Bible. For Vault folder, change the folder path in Settings."
					);
				})();
			},
		});

		this.addCommand({
			id: "open-interlinear-folder",
			name: "Ensure interlinear notes folder exists",
			callback: () => {
				void (async () => {
					const folder = (this.settings.interlinearNotesPath || "Scripture/Interlinear").replace(/\/$/, "");
					if (!this.app.vault.getAbstractFileByPath(folder)) {
						const parts = folder.split("/").filter(Boolean);
						let acc = "";
						for (const p of parts) {
							acc = acc ? `${acc}/${p}` : p;
							if (!this.app.vault.getAbstractFileByPath(acc)) {
								await this.app.vault.createFolder(acc);
							}
						}
					}
					new Notice(`Interlinear folder ready: ${folder}`);
				})();
			},
		});
	}

	openParsed(parsed: ReturnType<typeof parseReference>): void {
		if (!parsed?.segments[0]) return;
		const seg = parsed.segments[0];
		const primary = openExternalApp(this.settings.openApp, this.handoffOpts(), seg);
		if (primary) {
			openUrlExternally(primary);
			return;
		}
		if (this.settings.openApp === "none") return;
		if (this.settings.openApp === "logos_uri") {
			new Notice(
				"Logos: add resource alias + ref prefix in Scriptorium Settings (see Logos ‘copy location’ link), or paste a logosres: URI."
			);
			return;
		}
		const fallback = `https://biblia.com/bible/${encodeURIComponent(this.settings.bibliaTranslation)}/${
			seg.bookOsis
		}.${seg.chapter}.${seg.verses.start}`;
		openUrlExternally(fallback);
	}
}

class PericopePickModal extends SuggestModal<PericopeEntry> {
	constructor(
		app: App,
		private onPick: (p: PericopeEntry) => void
	) {
		super(app);
		this.setPlaceholder("Search pericopes…");
	}

	getSuggestions(query: string): PericopeEntry[] {
		const q = query.toLowerCase();
		return getActivePericopes().filter(
			(p) => !q || p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
		);
	}

	renderSuggestion(item: PericopeEntry, el: HTMLElement): void {
		el.createDiv({ text: item.title });
		el.createEl("small", { text: item.refs.join(" · ") });
	}

	onChooseSuggestion(item: PericopeEntry, _evt: MouseEvent | KeyboardEvent): void {
		this.close();
		this.onPick(item);
	}
}
