import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ScriptoriumPlugin from "./main";
import { BiblePickerModal } from "./ui/bible-picker";
import { parseReference, formatReferenceHuman } from "./reference/parser";
import { StudyNoteCreateModal } from "./studio/create-modal";

export type ExternalApp =
	| "olivetree"
	| "logos_uri"
	| "biblia_web"
	| "youversion"
	| "accordance"
	| "biblegateway"
	| "blueletter"
	| "stepbible"
	| "none";

export type TextProviderMode = "none" | "vault_folder" | "free_bible" | "api_bible" | "esv";

export interface ScriptoriumSettings {
	suggestTrigger: string;
	highlightInlineRefs: boolean;
	colorBookSection: boolean;
	editorHighlightDebounceMs: number;
	openApp: ExternalApp;
	olivetreeScheme: string;
	bibliaTranslation: string;
	youVersionBibleId: string;
	logosResourceAlias: string;
	logosRefPrefix: string;
	textProvider: TextProviderMode;
	vaultBibleFolder: string;
	freeBibleTranslation: string;
	apiBibleKey: string;
	apiBibleTranslation: string;
	esvApiKey: string;
	hubFolder: string;
	hubPerChapter: boolean;
	pasteNormalizeLogos: boolean;
	pasteAutoLinkify: boolean;
	lexiconBaseUrlGreek: string;
	lexiconBaseUrlHebrew: string;
	passageCodeBlocks: boolean;
	scriptureCallouts: boolean;
	readingProcessRefs: boolean;
	includeDeuterocanon: boolean;
	allowNetwork: boolean;
	showPassageRibbon: boolean;
	showStudyNoteRibbon: boolean;
	lectionaryCsvPath: string;
	interlinearNotesPath: string;
	customAliases: Record<string, string>;
	customAliasesNotePath: string;
	pericopesNotePath: string;
	suggestAriaHints: boolean;
	ambientSuggest: boolean;
	selectionBubble: boolean;
	hoverPopover: boolean;
}

export const DEFAULT_SETTINGS: ScriptoriumSettings = {
	suggestTrigger: "/ref",
	highlightInlineRefs: true,
	colorBookSection: false,
	editorHighlightDebounceMs: 120,
	openApp: "olivetree",
	olivetreeScheme: "olivetree",
	bibliaTranslation: "ESV",
	youVersionBibleId: "111",
	logosResourceAlias: "",
	logosRefPrefix: "",
	textProvider: "free_bible",
	vaultBibleFolder: "Scripture/Text",
	freeBibleTranslation: "web",
	apiBibleKey: "",
	apiBibleTranslation: "",
	esvApiKey: "",
	hubFolder: "Scripture/Hub",
	hubPerChapter: true,
	pasteNormalizeLogos: true,
	pasteAutoLinkify: false,
	lexiconBaseUrlGreek: "https://www.blueletterbible.org/lexicon/greek/strongs-g",
	lexiconBaseUrlHebrew: "https://www.blueletterbible.org/lexicon/hebrew/strongs-h",
	passageCodeBlocks: true,
	scriptureCallouts: true,
	readingProcessRefs: true,
	includeDeuterocanon: false,
	allowNetwork: true,
	showPassageRibbon: false,
	showStudyNoteRibbon: true,
	lectionaryCsvPath: "",
	interlinearNotesPath: "Scripture/Interlinear",
	customAliases: {},
	customAliasesNotePath: "",
	pericopesNotePath: "",
	suggestAriaHints: true,
	ambientSuggest: false,
	selectionBubble: true,
	hoverPopover: true,
};

type SectionDef = {
	id: string;
	label: string;
	helper: string;
	render: (host: HTMLElement) => void;
};

export class ScriptoriumSettingTab extends PluginSettingTab {
	plugin: ScriptoriumPlugin;

	constructor(app: App, plugin: ScriptoriumPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("scriptorium-settings");

		const header = containerEl.createDiv({ cls: "scriptorium-settings-header" });
		header.createEl("h2", { text: "Scriptorium" });
		header.createEl("p", {
			cls: "scriptorium-settings-tagline",
			text: "Scripture references, app handoffs, previews, and study workflows.",
		});

		const searchWrap = containerEl.createDiv({ cls: "scriptorium-settings-search" });
		const searchInput = searchWrap.createEl("input", {
			attr: { type: "search", placeholder: "Search settings…", "aria-label": "Search settings" },
		});

		const nav = containerEl.createDiv({ cls: "scriptorium-settings-nav" });
		const sectionsHost = containerEl.createDiv({ cls: "scriptorium-settings-sections" });

		const sections: SectionDef[] = [
			{ id: "editor", label: "Editor", helper: "Inline highlighting, hover popovers, autocomplete, the selection action bar.", render: (h) => this.sectionEditor(h) },
			{
				id: "study-notes",
				label: "Study notes",
				helper:
					"Sermon outlines, inductive study, lectio divina, and other templated notes. Also available from the left ribbon when enabled and via the command palette.",
				render: (h) => this.sectionStudyNotes(h),
			},
			{ id: "canon", label: "Canon", helper: "Which books are recognized, custom aliases, deuterocanon.", render: (h) => this.sectionCanon(h) },
			{ id: "external", label: "External apps", helper: "Where 'Open in app' commands send refs (Olive Tree, YouVersion, Accordance, biblia.com, Logos).", render: (h) => this.sectionExternalApps(h) },
			{ id: "providers", label: "Text providers", helper: "Where verse text comes from. Free Bible API needs no key. API.Bible is BYO-key. Vault folder uses your own files.", render: (h) => this.sectionProviders(h) },
			{ id: "hub", label: "Hub & reading", helper: "Scripture hub note layout, paste handling, reading-mode behavior.", render: (h) => this.sectionHubReading(h) },
			{ id: "pedagogy", label: "Pedagogy", helper: "Lectionary CSV, interlinear/word-study folders.", render: (h) => this.sectionPedagogy(h) },
			{ id: "sidebar", label: "Sidebar", helper: "Passage pane and ribbon visibility.", render: (h) => this.sectionSidebar(h) },
			{ id: "advanced", label: "Advanced", helper: "Live parser test, settings export/import.", render: (h) => this.sectionAdvanced(h) },
		];

		const sectionEls: HTMLElement[] = [];
		for (const s of sections) {
			const navBtn = nav.createEl("button", {
				cls: "scriptorium-settings-nav-btn",
				text: s.label,
				attr: { "data-section-target": s.id },
			});
			navBtn.addEventListener("click", () => {
				const target = sectionsHost.querySelector(`[data-section-id="${s.id}"]`);
				target?.scrollIntoView({ behavior: "smooth", block: "start" });
			});

			const el = sectionsHost.createDiv({
				cls: "scriptorium-settings-section",
				attr: { "data-section-id": s.id },
			});
			el.createEl("h3", { text: s.label, cls: "scriptorium-settings-section-title" });
			el.createEl("p", { text: s.helper, cls: "scriptorium-settings-section-helper" });
			s.render(el);
			sectionEls.push(el);
		}

		searchInput.addEventListener("input", () => {
			const q = searchInput.value.trim().toLowerCase();
			for (const sec of sectionEls) {
				const items = Array.from(sec.querySelectorAll<HTMLElement>(".setting-item"));
				let anyVisible = q === "";
				for (const it of items) {
					const txt = (it.textContent ?? "").toLowerCase();
					const visible = q === "" || txt.includes(q);
					it.style.display = visible ? "" : "none";
					if (visible) anyVisible = true;
				}
				const helper = sec.querySelector<HTMLElement>(".scriptorium-settings-section-helper");
				if (helper) helper.style.display = q === "" ? "" : "none";
				sec.style.display = anyVisible ? "" : "none";
			}
		});
	}

	// -----------------------------------------------------------------------
	// Sections
	// -----------------------------------------------------------------------

	private sectionEditor(host: HTMLElement): void {
		new Setting(host)
			.setName("Reference suggest trigger")
			.setDesc("Type after whitespace to open passage autocomplete.")
			.addText((t) =>
				t.setValue(this.plugin.settings.suggestTrigger).onChange(async (v) => {
					this.plugin.reconcileSuggestTrigger(v);
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Highlight inline references")
			.setDesc("Underline detected references in the editor.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.highlightInlineRefs).onChange(async (v) => {
					this.plugin.settings.highlightInlineRefs = v;
					await this.plugin.saveSettings();
					this.plugin.refreshEditorExtensions();
				})
			);

		new Setting(host)
			.setName("Color references by book section")
			.setDesc("Tint underlines by canon section (Pentateuch / Wisdom / Prophets / Gospels / Epistles / etc.). Theme-aware via CSS variables.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.colorBookSection).onChange(async (v) => {
					this.plugin.settings.colorBookSection = v;
					await this.plugin.saveSettings();
					this.plugin.refreshEditorExtensions();
				})
			);

		new Setting(host)
			.setName("Hover popover on references")
			.setDesc("Show passage preview and quick actions when hovering a detected reference (works in both edit and reading mode).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.hoverPopover).onChange(async (v) => {
					this.plugin.settings.hoverPopover = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Selection action bar")
			.setDesc("When you select text containing a reference, show a floating bar with quick actions (open, hub, copy OSIS, insert text).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.selectionBubble).onChange(async (v) => {
					this.plugin.settings.selectionBubble = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Highlight debounce (ms)")
			.setDesc("Higher values reduce work on large notes while typing.")
			.addSlider((s) =>
				s
					.setLimits(0, 500, 10)
					.setValue(this.plugin.settings.editorHighlightDebounceMs)
					.setDynamicTooltip()
					.onChange(async (v) => {
						this.plugin.settings.editorHighlightDebounceMs = v;
						await this.plugin.saveSettings();
						this.plugin.refreshEditorExtensions();
					})
			);

		new Setting(host)
			.setName("Ambient reference suggestions")
			.setDesc("Surface a 'Linkify reference' suggestion when you've just finished typing something that looks like a reference (e.g. 'John 3:16'). No /ref needed.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.ambientSuggest).onChange(async (v) => {
					this.plugin.settings.ambientSuggest = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Screen reader hints on suggest")
			.setDesc("Adds aria-live announcements when a suggestion is chosen.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.suggestAriaHints).onChange(async (v) => {
					this.plugin.settings.suggestAriaHints = v;
					await this.plugin.saveSettings();
				})
			);
	}

	private sectionStudyNotes(host: HTMLElement): void {
		new Setting(host)
			.setName("Create a study note")
			.setDesc(
				"Picks template type (sermon, inductive, word study, lectio divina…), fills frontmatter with passage and metadata, saves under your chosen folder, and opens the new note. You can also run the palette command \"Scriptorium: New study note…\" (bind a shortcut under Settings → Hotkeys)."
			)
			.addButton((b) =>
				b
					.setButtonText("New study note…")
					.setCta()
					.onClick(() => {
						new StudyNoteCreateModal(this.app, this.plugin).open();
					})
			);
	}

	private sectionCanon(host: HTMLElement): void {
		new Setting(host)
			.setName("Include deuterocanon / Apocrypha")
			.setDesc("Adds Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees to the catalog.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.includeDeuterocanon).onChange(async (v) => {
					this.plugin.settings.includeDeuterocanon = v;
					await this.plugin.saveSettings();
					this.plugin.applyCanonAndAliases();
				})
			);

		new Setting(host)
			.setName("Custom book aliases (JSON object)")
			.setDesc('Optional. Example: {"ccb":"Sirach"} maps alias to OSIS id (Sir).')
			.addTextArea((ta) => {
				ta.inputEl.rows = 4;
				ta.setValue(JSON.stringify(this.plugin.settings.customAliases, null, 2)).onChange(async (v) => {
					try {
						this.plugin.settings.customAliases = v.trim() ? (JSON.parse(v) as Record<string, string>) : {};
						await this.plugin.saveSettings();
						this.plugin.applyCanonAndAliases();
					} catch {
						new Notice("Invalid JSON for custom aliases");
					}
				});
			});

		new Setting(host)
			.setName("Load aliases from note path")
			.setDesc("YAML frontmatter key aliases_map (object), or a single ```json fenced block with an object.")
			.addText((t) =>
				t.setValue(this.plugin.settings.customAliasesNotePath).onChange(async (v) => {
					this.plugin.settings.customAliasesNotePath = v.trim();
					await this.plugin.saveSettings();
					void this.plugin.loadAliasesFromNote();
				})
			);

		new Setting(host)
			.setName("Reload aliases from note")
			.addButton((b) =>
				b.setButtonText("Reload").onClick(async () => {
					await this.plugin.loadAliasesFromNote();
					new Notice("Aliases reloaded");
				})
			);
	}

	private sectionExternalApps(host: HTMLElement): void {
		new Setting(host)
			.setName("Open passages in")
			.setDesc("Default destination for 'Open in app' commands.")
			.addDropdown((d) =>
				d
					.addOption("olivetree", "Olive Tree (olivetree://)")
					.addOption("youversion", "YouVersion (bible.com)")
					.addOption("accordance", "Accordance (accord://)")
					.addOption("biblia_web", "biblia.com (web)")
					.addOption("biblegateway", "BibleGateway (web)")
					.addOption("blueletter", "Blue Letter Bible (web)")
					.addOption("stepbible", "STEP Bible (web)")
					.addOption("logos_uri", "Logos desktop (logosres:)")
					.addOption("none", "No automatic URL in commands")
					.setValue(this.plugin.settings.openApp)
					.onChange(async (v) => {
						this.plugin.settings.openApp = v as ExternalApp;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.openApp === "logos_uri") {
			new Setting(host)
				.setName("Logos resource alias")
				.setDesc(
					"Short id before the semicolon in a logosres: link from Logos (e.g. esv in logosres:esv;ref=…)."
				)
				.addText((t) =>
					t.setValue(this.plugin.settings.logosResourceAlias).onChange(async (v) => {
						this.plugin.settings.logosResourceAlias = v.trim();
						await this.plugin.saveSettings();
					})
				);

			new Setting(host)
				.setName("Logos ref prefix")
				.setDesc(
					"Dataset prefix before the passage in ref= (e.g. BibleESV in ref=BibleESV.Joh3.16). Copy one Bible link from Logos and match these two parts."
				)
				.addText((t) =>
					t.setValue(this.plugin.settings.logosRefPrefix).onChange(async (v) => {
						this.plugin.settings.logosRefPrefix = v.trim();
						await this.plugin.saveSettings();
					})
				);
		}

		new Setting(host)
			.setName("Olive Tree URL scheme")
			.setDesc("Override if your install registered a non-default scheme.")
			.addText((t) =>
				t.setValue(this.plugin.settings.olivetreeScheme).onChange(async (v) => {
					this.plugin.settings.olivetreeScheme = v.replace(/[^a-zA-Z0-9-]/g, "") || "olivetree";
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("biblia.com translation slug")
			.setDesc("E.g. ESV, NIV, KJV — used in biblia.com URLs.")
			.addText((t) =>
				t.setValue(this.plugin.settings.bibliaTranslation).onChange(async (v) => {
					this.plugin.settings.bibliaTranslation = v.trim() || "ESV";
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("YouVersion Bible id")
			.setDesc("Numeric id from a bible.com URL (e.g. 111 for NIV, 1 for KJV).")
			.addText((t) =>
				t.setValue(this.plugin.settings.youVersionBibleId).onChange(async (v) => {
					this.plugin.settings.youVersionBibleId = v.trim() || "111";
					await this.plugin.saveSettings();
				})
			);
	}

	private sectionProviders(host: HTMLElement): void {
		new Setting(host)
			.setName("Allow network")
			.setDesc("When off, only vault-based text and offline features run. The status-bar item also toggles this.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.allowNetwork).onChange(async (v) => {
					this.plugin.settings.allowNetwork = v;
					await this.plugin.saveSettings();
					this.plugin.refreshProviders();
				})
			);

		new Setting(host)
			.setName("Text provider")
			.setDesc("Free Bible API needs no key and works out of the box (public-domain translations). Use API.Bible if you have a key for additional translations, or Vault folder for your own files.")
			.addDropdown((d) =>
				d
					.addOption("free_bible", "Free Bible API (no key, public domain)")
					.addOption("vault_folder", "Vault folder")
					.addOption("esv", "ESV API (bring your own key)")
					.addOption("api_bible", "API.Bible (bring your own key)")
					.addOption("none", "References only (no text)")
					.setValue(this.plugin.settings.textProvider)
					.onChange(async (v) => {
						this.plugin.settings.textProvider = v as TextProviderMode;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		const mode = this.plugin.settings.textProvider;

		if (mode === "free_bible") {
			new Setting(host)
				.setName("Free Bible translation")
				.setDesc("All public-domain. WEB is the most readable modern English; KJV is traditional; YLT is hyper-literal. Modern copyrighted translations (ESV, NIV, NASB, LSB) are not in the public domain — use the Vault folder option for those if you have your own copy.")
				.addDropdown((d) =>
					d
						.addOption("web", "World English Bible (WEB) — modern, default")
						.addOption("kjv", "King James Version (KJV, 1611)")
						.addOption("asv", "American Standard Version (ASV, 1901)")
						.addOption("bbe", "Bible in Basic English (BBE)")
						.addOption("oeb-cw", "Open English Bible — Commonwealth")
						.addOption("oeb-us", "Open English Bible — US")
						.addOption("darby", "Darby Bible (1890)")
						.addOption("ylt", "Young's Literal Translation (YLT)")
						.addOption("dra", "Douay–Rheims American (DRA, Catholic)")
						.addOption("clementine", "Clementine Vulgate (Latin)")
						.setValue(this.plugin.settings.freeBibleTranslation || "web")
						.onChange(async (v) => {
							this.plugin.settings.freeBibleTranslation = v;
							await this.plugin.saveSettings();
						})
				);

			new Setting(host)
				.setName("Test free Bible connection")
				.addButton((b) =>
					b.setButtonText("Test").onClick(async () => {
						const r = await this.plugin.freeProvider?.ping();
						new Notice(r?.ok ? `OK: ${r.message}` : `Failed: ${r?.message ?? "unknown"}`);
					})
				);
		}

		if (mode === "vault_folder") {
			new Setting(host)
				.setName("Vault Bible folder")
				.setDesc("Folder containing per-chapter Markdown files (e.g. Scripture/Text/John/3.md).")
				.addText((t) =>
					t.setValue(this.plugin.settings.vaultBibleFolder).onChange(async (v) => {
						this.plugin.settings.vaultBibleFolder = v.trim();
						await this.plugin.saveSettings();
						this.plugin.refreshProviders();
					})
				);
		}

		if (mode === "esv") {
			const esvHelp = host.createDiv({ cls: "scriptorium-settings-help" });
			esvHelp.createSpan({ text: "ESV API needs a free key. " });
			const esvLink = esvHelp.createEl("a", { text: "Get a key →", href: "https://api.esv.org/" });
			esvLink.setAttr("target", "_blank");
			esvHelp.createSpan({ text: " Then paste it below. The free tier covers personal study with reasonable caching." });

			new Setting(host)
				.setName("ESV API key")
				.setDesc(
					this.plugin.settings.esvApiKey
						? `Stored locally — ends in …${this.plugin.settings.esvApiKey.slice(-4)}`
						: "Stored locally in this vault."
				)
				.addText((t) => {
					t.inputEl.type = "password";
					t.setValue(this.plugin.settings.esvApiKey).onChange(async (v) => {
						this.plugin.settings.esvApiKey = v;
						await this.plugin.saveSettings();
						this.plugin.refreshProviders();
					});
				})
				.addExtraButton((b) =>
					b
						.setIcon("trash-2")
						.setTooltip("Clear key")
						.onClick(async () => {
							this.plugin.settings.esvApiKey = "";
							await this.plugin.saveSettings();
							this.plugin.refreshProviders();
							this.display();
						})
				);

			new Setting(host)
				.setName("Test ESV connection")
				.addButton((b) =>
					b.setButtonText("Test").onClick(async () => {
						const r = await this.plugin.esvProvider?.ping();
						new Notice(r?.ok ? `OK: ${r.message}` : `Failed: ${r?.message ?? "unknown"}`);
					})
				);
		}

		if (mode === "api_bible") {
			const helpEl = host.createDiv({ cls: "scriptorium-settings-help" });
			helpEl.createSpan({ text: "API.Bible needs a free account. " });
			const link = helpEl.createEl("a", {
				text: "Get a key →",
				href: "https://scripture.api.bible/",
			});
			link.setAttr("target", "_blank");
			helpEl.createSpan({ text: " Then paste it below and choose a Bible id." });

			new Setting(host)
				.setName("API.Bible key")
				.setDesc(
					this.plugin.settings.apiBibleKey
						? `Stored locally in this vault — ends in …${this.plugin.settings.apiBibleKey.slice(-4)}`
						: "Stored locally in this vault."
				)
				.addText((t) => {
					t.inputEl.type = "password";
					t.setValue(this.plugin.settings.apiBibleKey).onChange(async (v) => {
						this.plugin.settings.apiBibleKey = v;
						await this.plugin.saveSettings();
						this.plugin.refreshProviders();
					});
				})
				.addExtraButton((b) =>
					b
						.setIcon("trash-2")
						.setTooltip("Clear key")
						.onClick(async () => {
							this.plugin.settings.apiBibleKey = "";
							await this.plugin.saveSettings();
							this.plugin.refreshProviders();
							this.display();
						})
				);

			new Setting(host)
				.setName("API.Bible Bible id")
				.setDesc("Paste a Bible id, or use Browse to pick from your account's catalog.")
				.addText((t) =>
					t.setValue(this.plugin.settings.apiBibleTranslation).onChange(async (v) => {
						this.plugin.settings.apiBibleTranslation = v.trim();
						await this.plugin.saveSettings();
						this.plugin.refreshProviders();
					})
				)
				.addButton((b) =>
					b.setButtonText("Browse").onClick(async () => {
						if (!this.plugin.settings.apiBibleKey) {
							new Notice("Set the API.Bible key first.");
							return;
						}
						const entries = await this.plugin.apiProvider?.listBibles();
						if (!entries || entries.length === 0) {
							new Notice("No Bibles returned — check the key and network.");
							return;
						}
						new BiblePickerModal(this.app, entries, async (entry) => {
							this.plugin.settings.apiBibleTranslation = entry.id;
							await this.plugin.saveSettings();
							this.plugin.refreshProviders();
							this.display();
							new Notice(`Selected ${entry.abbreviation || entry.name}`);
						}).open();
					})
				);

			new Setting(host)
				.setName("Test API.Bible connection")
				.addButton((b) =>
					b.setButtonText("Test").onClick(async () => {
						const r = await this.plugin.apiProvider?.ping();
						new Notice(r?.ok ? `OK: ${r.message}` : `Failed: ${r?.message ?? "unknown"}`);
					})
				);
		}
	}

	private sectionHubReading(host: HTMLElement): void {
		new Setting(host)
			.setName("Scripture hub folder")
			.setDesc("Where 'Open or create scripture hub' lands new notes.")
			.addText((t) =>
				t.setValue(this.plugin.settings.hubFolder).onChange(async (v) => {
					this.plugin.settings.hubFolder = v.trim() || "Scripture/Hub";
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Hub note per chapter")
			.setDesc("On = one hub per chapter (Scripture/Hub/John/ch-3.md). Off = one hub per verse range.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.hubPerChapter).onChange(async (v) => {
					this.plugin.settings.hubPerChapter = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Normalize Logos paste")
			.setDesc("Rewrite pasted Logos URIs (logosres:, logos4:, logosft:) as Markdown links.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.pasteNormalizeLogos).onChange(async (v) => {
					this.plugin.settings.pasteNormalizeLogos = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Auto-linkify references on paste")
			.setDesc("When pasted text contains scripture references, wrap them as wikilinks to hub paths. Skips refs already inside links or code.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.pasteAutoLinkify).onChange(async (v) => {
					this.plugin.settings.pasteAutoLinkify = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Process ```passage code blocks in reading mode")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.passageCodeBlocks).onChange(async (v) => {
					this.plugin.settings.passageCodeBlocks = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Rich scripture & Strong's in reading mode")
			.setDesc("Detects references in paragraphs (can affect Publish; see README).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.readingProcessRefs).onChange(async (v) => {
					this.plugin.settings.readingProcessRefs = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Expand [!scripture] / [!bible] / [!passage] callouts")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.scriptureCallouts).onChange(async (v) => {
					this.plugin.settings.scriptureCallouts = v;
					await this.plugin.saveSettings();
				})
			);
	}

	private sectionPedagogy(host: HTMLElement): void {
		new Setting(host)
			.setName("Lectionary CSV path (in vault)")
			.setDesc("Columns: date,ref1,ref2,... ISO dates YYYY-MM-DD.")
			.addText((t) =>
				t.setValue(this.plugin.settings.lectionaryCsvPath).onChange(async (v) => {
					this.plugin.settings.lectionaryCsvPath = v.trim();
					await this.plugin.saveSettings();
					void this.plugin.loadLectionary();
				})
			);

		new Setting(host)
			.setName("Pericope pack note path")
			.setDesc(
				"Optional. A note containing a JSON code block with extra pericope entries to add to the built-in set. Each entry: {id, title, refs:[]}."
			)
			.addText((t) =>
				t.setValue(this.plugin.settings.pericopesNotePath).onChange(async (v) => {
					this.plugin.settings.pericopesNotePath = v.trim();
					await this.plugin.saveSettings();
					void this.plugin.loadPericopesFromNote();
				})
			);

		new Setting(host)
			.setName("Reload pericope pack")
			.addButton((b) =>
				b.setButtonText("Reload").onClick(async () => {
					await this.plugin.loadPericopesFromNote();
					new Notice("Pericope pack reloaded");
				})
			);

		new Setting(host)
			.setName("Interlinear / word-study notes folder")
			.setDesc("Used by 'Ensure interlinear notes folder exists' command.")
			.addText((t) =>
				t.setValue(this.plugin.settings.interlinearNotesPath).onChange(async (v) => {
					this.plugin.settings.interlinearNotesPath = v.trim() || "Scripture/Interlinear";
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Greek lexicon URL prefix")
			.setDesc("Used when clicking a G#### Strong's number. {n} is the number.")
			.addText((t) =>
				t.setValue(this.plugin.settings.lexiconBaseUrlGreek).onChange(async (v) => {
					this.plugin.settings.lexiconBaseUrlGreek = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(host)
			.setName("Hebrew lexicon URL prefix")
			.addText((t) =>
				t.setValue(this.plugin.settings.lexiconBaseUrlHebrew).onChange(async (v) => {
					this.plugin.settings.lexiconBaseUrlHebrew = v.trim();
					await this.plugin.saveSettings();
				})
			);
	}

	private sectionSidebar(host: HTMLElement): void {
		new Setting(host)
			.setName("Ribbon: New study note")
			.setDesc("Shortcut to sermon, inductive, word study, and other templated notes (same modal as the command palette).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.showStudyNoteRibbon).onChange(async (v) => {
					this.plugin.settings.showStudyNoteRibbon = v;
					await this.plugin.saveSettings();
					this.plugin.refreshRibbon();
				})
			);

		new Setting(host)
			.setName("Ribbon: passage pane")
			.setDesc("Open the scripture passage sidebar.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.showPassageRibbon).onChange(async (v) => {
					this.plugin.settings.showPassageRibbon = v;
					await this.plugin.saveSettings();
					this.plugin.refreshRibbon();
				})
			);
	}

	private sectionAdvanced(host: HTMLElement): void {
		// Live parser test
		const parserTest = new Setting(host)
			.setName("Test parser")
			.setDesc("Type any reference here and see what Scriptorium parses. Useful for verifying custom aliases.");
		const out = parserTest.controlEl.createDiv({ cls: "scriptorium-settings-parser-out" });
		parserTest.addText((t) => {
			t.inputEl.style.width = "60%";
			t.setPlaceholder("e.g. 1 Cor 13:4-7");
			t.onChange((v) => {
				if (!v.trim()) {
					out.textContent = "";
					return;
				}
				const p = parseReference(v);
				if (!p) {
					out.textContent = "(no parse)";
					out.classList.add("scriptorium-parser-empty");
				} else {
					out.classList.remove("scriptorium-parser-empty");
					out.textContent = `→ ${formatReferenceHuman(p.segments)} · ${p.segments.length} segment(s)`;
				}
			});
		});

		// Settings export / import (C.3)
		new Setting(host)
			.setName("Export settings")
			.setDesc("Copy current settings as JSON to clipboard. Useful for sharing alias packs.")
			.addButton((b) =>
				b.setButtonText("Copy").onClick(() => {
					const json = JSON.stringify(this.plugin.settings, null, 2);
					void navigator.clipboard.writeText(json);
					new Notice("Settings copied to clipboard");
				})
			);

		new Setting(host)
			.setName("Import settings")
			.setDesc("Paste a settings JSON object. Existing values are merged; missing keys keep current values.")
			.addTextArea((ta) => {
				ta.inputEl.rows = 4;
				ta.setPlaceholder('{"openApp":"olivetree","includeDeuterocanon":true,...}');
				ta.inputEl.addEventListener("blur", async () => {
					const v = ta.getValue().trim();
					if (!v) return;
					try {
						const parsed = JSON.parse(v) as Partial<ScriptoriumSettings>;
						this.plugin.settings = Object.assign({}, this.plugin.settings, parsed);
						await this.plugin.saveSettings();
						this.plugin.applyCanonAndAliases();
						new Notice("Settings imported");
						this.display();
					} catch {
						new Notice("Invalid JSON — nothing imported");
					}
				});
			});

		new Setting(host)
			.setName("Reset to defaults")
			.setDesc("Restore Scriptorium defaults. Custom aliases and external app preference are kept.")
			.addButton((b) =>
				b.setButtonText("Reset").onClick(async () => {
					const keep = {
						customAliases: this.plugin.settings.customAliases,
						customAliasesNotePath: this.plugin.settings.customAliasesNotePath,
						openApp: this.plugin.settings.openApp,
					};
					this.plugin.settings = Object.assign({}, DEFAULT_SETTINGS, keep);
					await this.plugin.saveSettings();
					this.plugin.applyCanonAndAliases();
					this.plugin.refreshEditorExtensions();
					this.plugin.refreshRibbon();
					this.display();
					new Notice("Settings reset to defaults");
				})
			);
	}
}
