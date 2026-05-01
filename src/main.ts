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
import { registerReadingModeProcessors } from "./reading/postprocess";
import { parseReference } from "./reference/parser";
import { toNumericOsisString } from "./reference/osis";
import { configureCanon } from "./reference/books";
import { setOsisCompactExtras } from "./reference/osis";
import { openExternalApp, LOGOS_URI_PATTERN } from "./handoff/urls";
import type { HandoffOpts } from "./handoff/types";
import { normalizePastedText } from "./handoff/paste";
import { NoneTextProvider, type TextProvider } from "./providers/types";
import { VaultFolderTextProvider } from "./providers/vault-provider";
import { ApiBibleTextProvider } from "./providers/api-provider";
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
	apiProvider: ApiBibleTextProvider | null = null;
	apiResponseCache = new Map<string, { text: string; attribution?: string }>();
	lectionaryRows: LectionaryRow[] = [];
	ribbonEl: HTMLElement | null = null;

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
	}

	refreshProviders(): void {
		this.vaultProvider = new VaultFolderTextProvider(this.app, this.settings.vaultBibleFolder);
		this.apiProvider = new ApiBibleTextProvider(
			this.settings.apiBibleKey,
			this.settings.apiBibleTranslation,
			this.settings.allowNetwork,
			this.apiResponseCache
		);
	}

	pickProvider(): TextProvider {
		if (!this.settings.allowNetwork && this.settings.textProvider === "api_bible") {
			return this.noneProvider;
		}
		return pickTextProvider(this.noneProvider, this.vaultProvider, this.apiProvider, this.settings.textProvider);
	}

	refreshEditorExtensions(debounceMs?: number): void {
		const ms = debounceMs ?? this.settings.editorHighlightDebounceMs;
		this.cmExtras.length = 0;
		if (this.settings.highlightInlineRefs) {
			this.cmExtras.push(createRefHighlightPlugin(ms));
		}
		this.app.workspace.updateOptions();
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

		const aria = document.createElement("div");
		aria.id = "scriptorium-aria-live";
		aria.setAttribute("role", "status");
		aria.setAttribute("aria-live", "polite");
		aria.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;";
		document.body.appendChild(aria);
		this.register(() => aria.remove());

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const leaves = this.app.workspace.getLeavesOfType(PASSAGE_VIEW_TYPE);
				const v = leaves[0]?.view;
				if (v instanceof PassagePaneView) void v.refresh();
			})
		);

		this.registerEvent(
			this.app.workspace.on("editor-paste", (clipboard: ClipboardEvent, editor: Editor) => {
				const raw = clipboard.clipboardData?.getData("text/plain");
				if (!raw) return;
				const next = normalizePastedText(raw, this.settings.pasteNormalizeLogos);
				if (next === raw) return;
				clipboard.preventDefault();
				editor.replaceSelection(next);
			})
		);

		this.addCommand({
			id: "scriptorium-open-cursor-ref",
			name: "Scriptorium: Open passage under cursor (external)",
			editorCallback: (editor) => {
				const line = editor.getLine(editor.getCursor().line);
				const sel = editor.getSelection() || line;
				let parsed = parseReference(sel.trim());
				if (!parsed) {
					const m = line.match(
						/\b((?:[1-3]\s+)?[A-Za-z][A-Za-z'.]*(?:\s+[A-Za-z][A-Za-z'.]*){0,3}\s+\d+\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)\b/
					);
					if (m) parsed = parseReference(m[0]!);
				}
				if (!parsed) {
					new Notice("No reference found at cursor");
					return;
				}
				this.openParsed(parsed);
			},
		});

		this.addCommand({
			id: "scriptorium-open-hub",
			name: "Scriptorium: Open or create scripture hub note",
			editorCallback: async (editor) => {
				const sel = editor.getSelection() || editor.getLine(editor.getCursor().line);
				const parsed = parseReference(sel.trim());
				if (!parsed) {
					new Notice("Select a reference first");
					return;
				}
				const file = await ensureHubNote(
					this.app,
					this.settings.hubFolder,
					this.settings.hubPerChapter,
					parsed.segments[0]!
				);
				await this.app.workspace.openLinkText(file.path, "", true);
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
				const sel = editor.getSelection() || editor.getLine(editor.getCursor().line);
				const parsed = parseReference(sel.trim());
				if (!parsed) {
					new Notice("No reference found");
					return;
				}
				void navigator.clipboard.writeText(toNumericOsisString(parsed.segments));
				new Notice("Copied passage id");
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
