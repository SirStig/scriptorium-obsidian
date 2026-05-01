import {
	MarkdownView,
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
import { registerReadingModeProcessors } from "./reading/postprocess";
import { parseReference } from "./reference/parser";
import { toNumericOsisString } from "./reference/osis";
import { configureCanon } from "./reference/books";
import { setOsisCompactExtras } from "./reference/osis";
import { openExternalApp, LOGOS_URI_PATTERN } from "./handoff/urls";
import type { HandoffOpts } from "./handoff/types";
import { normalizePastedText, linkifyPastedText } from "./handoff/paste";
import { NoneTextProvider, type TextProvider } from "./providers/types";
import { VaultFolderTextProvider } from "./providers/vault-provider";
import { ApiBibleTextProvider } from "./providers/api-provider";
import { FreeBibleProvider } from "./providers/free-provider";
import { pickTextProvider } from "./providers/registry";
import { PassagePaneView, PASSAGE_VIEW_TYPE } from "./ui/passage-view";
import { parseLectionaryCsv, rowForDate, type LectionaryRow } from "./pedagogy/lectionary";
import { BUILTIN_PERICOPES, type PericopeEntry } from "./pedagogy/pericopes";
import { openGreekPicker, openHebrewPicker } from "./study/greek-insert";
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
	apiResponseCache = new Map<string, { text: string; attribution?: string }>();
	lectionaryRows: LectionaryRow[] = [];
	ribbonEl: HTMLElement | null = null;
	statusBarEl: HTMLElement | null = null;
	selectionBubble: SelectionBubble | null = null;
	hoverDelegate: RefHoverDelegate | null = null;

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
		};
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<ScriptoriumSettings> & { customAliases?: unknown } | undefined;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data ?? {});
		if (!this.settings.customAliases || typeof this.settings.customAliases !== "object") {
			this.settings.customAliases = {};
		}
		this.reconcileSuggestTrigger(this.settings.suggestTrigger);
		this.applyCanonAndAliases();
	}

	applyCanonAndAliases(): void {
		configureCanon(this.settings.includeDeuterocanon, this.settings.customAliases);
		setOsisCompactExtras(this.settings.customAliases);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
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
	}

	pickProvider(): TextProvider {
		const networkOnly = this.settings.textProvider === "api_bible" || this.settings.textProvider === "free_bible";
		if (!this.settings.allowNetwork && networkOnly) {
			return this.noneProvider;
		}
		return pickTextProvider(
			this.noneProvider,
			this.vaultProvider,
			this.freeProvider,
			this.apiProvider,
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
						: "Refs only";
		const net = this.settings.allowNetwork ? "online" : "offline";
		const networkBound = mode === "api_bible" || mode === "free_bible";
		const showNet = networkBound || !this.settings.allowNetwork;
		this.statusBarEl.setText(`Scriptorium · ${provider}${showNet ? ` · ${net}` : ""}`);
		this.statusBarEl.setAttr(
			"aria-label",
			`Scriptorium text provider ${provider}${showNet ? `, network ${net}` : ""} — click to toggle network`
		);
	}

	refreshRibbon(): void {
		if (this.ribbonEl) {
			this.ribbonEl.remove();
			this.ribbonEl = null;
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
		workspace.revealLeaf(leaf);
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

	async loadAliasesFromNote(): Promise<void> {
		const p = this.settings.customAliasesNotePath;
		if (!p) return;
		const f = this.app.vault.getAbstractFileByPath(p);
		if (!(f instanceof TFile)) return;
		const text = await this.app.vault.read(f);
		const fm = this.app.metadataCache.getFileCache(f)?.frontmatter as Record<string, unknown> | undefined;
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
				new Notice("Could not parse json code block in alias note");
			}
		}
		await this.saveSettings();
	}

	async onload(): Promise<void> {
		this.suggest = new ReferenceSuggest(this.app, this);
		await this.loadSettings();
		await this.loadLectionary();
		await this.loadAliasesFromNote();
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

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.addClass("scriptorium-statusbar");
		this.statusBarEl.style.cursor = "pointer";
		this.statusBarEl.addEventListener("click", () => {
			this.settings.allowNetwork = !this.settings.allowNetwork;
			void this.saveSettings();
			new Notice(
				`Scriptorium network ${this.settings.allowNetwork ? "enabled" : "disabled"}`
			);
		});
		this.refreshStatusBar();

		const aria = document.createElement("div");
		aria.id = "scriptorium-aria-live";
		aria.setAttribute("role", "status");
		aria.setAttribute("aria-live", "polite");
		aria.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;";
		document.body.appendChild(aria);
		this.register(() => aria.remove());

		let passageRefreshTimer = 0;
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				window.clearTimeout(passageRefreshTimer);
				passageRefreshTimer = window.setTimeout(() => {
					const leaves = this.app.workspace.getLeavesOfType(PASSAGE_VIEW_TYPE);
					const v = leaves[0]?.view;
					if (v instanceof PassagePaneView) void v.refresh();
				}, 150);
			})
		);
		this.register(() => window.clearTimeout(passageRefreshTimer));

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
			id: "scriptorium-open-cursor-ref",
			name: "Scriptorium: Open passage under cursor (external)",
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
			id: "scriptorium-open-hub",
			name: "Scriptorium: Open or create scripture hub note",
			editorCallback: async (editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) {
					new Notice("No reference at cursor");
					return;
				}
				const file = await ensureHubNote(
					this.app,
					this.settings.hubFolder,
					this.settings.hubPerChapter,
					hit.parsed.segments[0]!
				);
				await this.app.workspace.openLinkText(file.path, "", true);
			},
		});

		this.addCommand({
			id: "scriptorium-insert-passage-text",
			name: "Scriptorium: Insert passage text at cursor",
			editorCallback: async (editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) {
					new Notice("No reference at cursor");
					return;
				}
				const seg = hit.parsed.segments[0]!;
				const provider = this.pickProvider();
				const r = await provider.getPassage(seg);
				if (!r?.text) {
					new Notice("No text from current provider — configure one in settings.");
					return;
				}
				const lines = r.text.split(/\r?\n/).map((l) => `> ${l}`).join("\n");
				const attribution = r.attribution ? `\n> — ${r.attribution}` : "";
				const block = `\n${lines}${attribution}\n`;
				editor.replaceRange(block, { line: hit.to.line, ch: hit.to.ch });
			},
		});

		this.addCommand({
			id: "scriptorium-copy-logos-pattern",
			name: "Scriptorium: Copy Logos URI selection as Markdown link",
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
			id: "scriptorium-copy-osis",
			name: "Scriptorium: Copy OSIS-style passage id",
			editorCallback: (editor) => {
				const hit = findRefAtCursor(editor);
				if (!hit) {
					new Notice("No reference found");
					return;
				}
				void navigator.clipboard.writeText(toNumericOsisString(hit.parsed.segments));
				new Notice("Copied passage id");
			},
		});

		this.addCommand({
			id: "scriptorium-convert-cursor-to-wikilink",
			name: "Scriptorium: Convert reference under cursor to hub wikilink",
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
			id: "scriptorium-link-refs-in-note",
			name: "Scriptorium: Link inline references to hub paths (whole note)",
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
			id: "scriptorium-refresh-passage-pane",
			name: "Scriptorium: Refresh passage pane",
			callback: () => {
				void this.activatePassageView();
			},
		});

		this.addCommand({
			id: "scriptorium-insert-lectionary-today",
			name: "Scriptorium: Insert today’s lectionary readings",
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
			id: "scriptorium-insert-pericope",
			name: "Scriptorium: Insert built-in pericope parallels",
			editorCallback: (editor) => {
				new PericopePickModal(this.app, (p) => {
					editor.replaceSelection(p.refs.join("\n") + "\n");
				}).open();
			},
		});

		this.addCommand({
			id: "scriptorium-greek-insert",
			name: "Scriptorium: Insert Greek character",
			callback: () => openGreekPicker(this.app),
		});

		this.addCommand({
			id: "scriptorium-hebrew-insert",
			name: "Scriptorium: Insert Hebrew character / mark",
			callback: () => openHebrewPicker(this.app),
		});

		this.addCommand({
			id: "scriptorium-switch-translation",
			name: "Scriptorium: Switch translation for current provider",
			callback: async () => {
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
					new BiblePickerModal(this.app, FREE_OPTS, async (e) => {
						this.settings.freeBibleTranslation = e.id;
						await this.saveSettings();
						new Notice(`Free Bible translation: ${e.abbreviation || e.name}`);
					}).open();
					return;
				}
				if (mode === "api_bible") {
					if (!this.settings.apiBibleKey) {
						new Notice("Set the API.Bible key in settings first.");
						return;
					}
					const entries = await this.apiProvider?.listBibles();
					if (!entries || entries.length === 0) {
						new Notice("No Bibles returned — check key and network.");
						return;
					}
					new BiblePickerModal(this.app, entries, async (e) => {
						this.settings.apiBibleTranslation = e.id;
						await this.saveSettings();
						new Notice(`API.Bible translation: ${e.abbreviation || e.name}`);
					}).open();
					return;
				}
				new Notice(
					"Switch translations only supported for Free Bible API and API.Bible. For Vault folder, change the folder path in settings."
				);
			},
		});

		this.addCommand({
			id: "scriptorium-open-interlinear-folder",
			name: "Scriptorium: Ensure interlinear notes folder exists",
			callback: async () => {
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
			},
		});
	}

	openParsed(parsed: ReturnType<typeof parseReference>): void {
		if (!parsed?.segments[0]) return;
		const seg = parsed.segments[0]!;
		const url =
			openExternalApp(this.settings.openApp, this.handoffOpts(), seg) ??
			`https://biblia.com/bible/${encodeURIComponent(this.settings.bibliaTranslation)}/${
				seg.bookOsis
			}.${seg.chapter}.${seg.verses.start}`;
		window.open(url);
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
		return BUILTIN_PERICOPES.filter(
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
