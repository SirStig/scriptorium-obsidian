import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ScriptoriumPlugin from "./main";
import { BiblePickerModal } from "./ui/bible-picker";

export type ExternalApp =
	| "olivetree"
	| "logos_uri"
	| "biblia_web"
	| "youversion"
	| "accordance"
	| "none";

export type TextProviderMode = "none" | "vault_folder" | "free_bible" | "api_bible";

export interface ScriptoriumSettings {
	suggestTrigger: string;
	highlightInlineRefs: boolean;
	colorBookSection: boolean;
	editorHighlightDebounceMs: number;
	openApp: ExternalApp;
	olivetreeScheme: string;
	bibliaTranslation: string;
	youVersionBibleId: string;
	textProvider: TextProviderMode;
	vaultBibleFolder: string;
	freeBibleTranslation: string;
	apiBibleKey: string;
	apiBibleTranslation: string;
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
	lectionaryCsvPath: string;
	interlinearNotesPath: string;
	customAliases: Record<string, string>;
	customAliasesNotePath: string;
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
	textProvider: "free_bible",
	vaultBibleFolder: "Scripture/Text",
	freeBibleTranslation: "web",
	apiBibleKey: "",
	apiBibleTranslation: "",
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
	lectionaryCsvPath: "",
	interlinearNotesPath: "Scripture/Interlinear",
	customAliases: {},
	customAliasesNotePath: "",
	suggestAriaHints: true,
	ambientSuggest: false,
	selectionBubble: true,
	hoverPopover: true,
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
		containerEl.createEl("h2", { text: "Scriptorium" });

		containerEl.createEl("h3", { text: "Editor" });
		new Setting(containerEl)
			.setName("Reference suggest trigger")
			.setDesc("Type after whitespace to open passage autocomplete.")
			.addText((t) =>
				t.setValue(this.plugin.settings.suggestTrigger).onChange(async (v) => {
					this.plugin.reconcileSuggestTrigger(v);
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Highlight inline references")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.highlightInlineRefs).onChange(async (v) => {
					this.plugin.settings.highlightInlineRefs = v;
					await this.plugin.saveSettings();
					this.plugin.refreshEditorExtensions();
				})
			);

		new Setting(containerEl)
			.setName("Hover popover on references")
			.setDesc("Show passage preview and quick actions when hovering a detected reference (works in both edit and reading mode).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.hoverPopover).onChange(async (v) => {
					this.plugin.settings.hoverPopover = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Selection action bar")
			.setDesc("When you select text containing a reference, show a floating bar with quick actions (open, hub, copy OSIS, insert text).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.selectionBubble).onChange(async (v) => {
					this.plugin.settings.selectionBubble = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Color references by book section")
			.setDesc(
				"Tint highlighted refs by canon section (Pentateuch / Wisdom / Prophets / Gospels / Epistles / etc.). Theme-aware via CSS variables."
			)
			.addToggle((c) =>
				c.setValue(this.plugin.settings.colorBookSection).onChange(async (v) => {
					this.plugin.settings.colorBookSection = v;
					await this.plugin.saveSettings();
					this.plugin.refreshEditorExtensions();
				})
			);

		new Setting(containerEl)
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

		new Setting(containerEl)
			.setName("Ambient reference suggestions")
			.setDesc(
				"Surface a 'Linkify reference' suggestion when you've just finished typing something that looks like a reference (e.g. 'John 3:16'). No /ref needed."
			)
			.addToggle((c) =>
				c.setValue(this.plugin.settings.ambientSuggest).onChange(async (v) => {
					this.plugin.settings.ambientSuggest = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Screen reader hints on suggest")
			.setDesc("Adds aria-live announcements when a suggestion is chosen.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.suggestAriaHints).onChange(async (v) => {
					this.plugin.settings.suggestAriaHints = v;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Canon" });
		new Setting(containerEl)
			.setName("Include deuterocanon / Apocrypha")
			.setDesc("Adds Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees to the catalog.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.includeDeuterocanon).onChange(async (v) => {
					this.plugin.settings.includeDeuterocanon = v;
					await this.plugin.saveSettings();
					this.plugin.applyCanonAndAliases();
				})
			);

		new Setting(containerEl)
			.setName("Custom book aliases (JSON object)")
			.setDesc('Optional. Example: {"ccb":"Sirach"} maps alias to OSIS id (Sir). Reload after edit.')
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

		new Setting(containerEl)
			.setName("Load aliases from note path")
			.setDesc("YAML frontmatter key aliases_map as a map, or a single code block labeled json with an object.")
			.addText((t) =>
				t.setValue(this.plugin.settings.customAliasesNotePath).onChange(async (v) => {
					this.plugin.settings.customAliasesNotePath = v.trim();
					await this.plugin.saveSettings();
					void this.plugin.loadAliasesFromNote();
				})
			);

		new Setting(containerEl)
			.setName("Reload aliases from note")
			.addButton((b) =>
				b.setButtonText("Reload").onClick(async () => {
					await this.plugin.loadAliasesFromNote();
					new Notice("Aliases reloaded");
				})
			);

		containerEl.createEl("h3", { text: "External apps" });
		new Setting(containerEl)
			.setName("Open passages in")
			.addDropdown((d) =>
				d
					.addOption("olivetree", "Olive Tree")
					.addOption("youversion", "YouVersion (bible.com web)")
					.addOption("accordance", "Accordance (accord://)")
					.addOption("biblia_web", "biblia.com (web)")
					.addOption("logos_uri", "Logos (paste links; no auto URL)")
					.addOption("none", "No automatic URL in commands")
					.setValue(this.plugin.settings.openApp)
					.onChange(async (v) => {
						this.plugin.settings.openApp = v as ExternalApp;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Olive Tree URL scheme")
			.addText((t) =>
				t.setValue(this.plugin.settings.olivetreeScheme).onChange(async (v) => {
					this.plugin.settings.olivetreeScheme = v.replace(/[^a-zA-Z0-9-]/g, "") || "olivetree";
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("biblia.com translation slug")
			.addText((t) =>
				t.setValue(this.plugin.settings.bibliaTranslation).onChange(async (v) => {
					this.plugin.settings.bibliaTranslation = v.trim() || "ESV";
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("YouVersion Bible id")
			.setDesc("Numeric id from bible.com URL (e.g. 111 for NIV).")
			.addText((t) =>
				t.setValue(this.plugin.settings.youVersionBibleId).onChange(async (v) => {
					this.plugin.settings.youVersionBibleId = v.trim() || "111";
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Text & network" });
		new Setting(containerEl)
			.setName("Allow network (API.Bible & remote previews)")
			.setDesc("When off, only vault-based text and offline features run.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.allowNetwork).onChange(async (v) => {
					this.plugin.settings.allowNetwork = v;
					await this.plugin.saveSettings();
					this.plugin.refreshProviders();
				})
			);

		new Setting(containerEl)
			.setName("Text provider")
			.setDesc(
				"Free Bible API needs no key and works out of the box (public-domain translations). Use API.Bible if you have a key for additional translations, or Vault folder for your own files."
			)
			.addDropdown((d) =>
				d
					.addOption("free_bible", "Free Bible API (no key, public domain)")
					.addOption("vault_folder", "Vault folder")
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
			new Setting(containerEl)
				.setName("Free Bible translation")
				.setDesc(
					"All public-domain. WEB is the most readable modern English; KJV is traditional; YLT is hyper-literal. Modern copyrighted translations (ESV, NIV, NASB, LSB) are not in the public domain — use the Vault folder option for those if you have your own copy."
				)
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

			new Setting(containerEl)
				.setName("Test free Bible connection")
				.addButton((b) =>
					b.setButtonText("Test").onClick(async () => {
						const r = await this.plugin.freeProvider?.ping();
						new Notice(r?.ok ? `OK: ${r.message}` : `Failed: ${r?.message ?? "unknown"}`);
					})
				);
		}

		if (mode === "vault_folder") {
			new Setting(containerEl)
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

		if (mode === "api_bible") {
			const help = containerEl.createDiv({ cls: "scriptorium-settings-help" });
			help.createSpan({ text: "API.Bible needs a free account. " });
			const link = help.createEl("a", {
				text: "Get a key →",
				href: "https://scripture.api.bible/",
			});
			link.setAttr("target", "_blank");
			help.createSpan({ text: " Then paste it below and choose a Bible id." });

			new Setting(containerEl)
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

			new Setting(containerEl)
				.setName("API.Bible Bible id")
				.setDesc(
					"Paste a Bible id, or use Browse to pick from your account's catalog."
				)
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

			new Setting(containerEl)
				.setName("Test API.Bible connection")
				.addButton((b) =>
					b.setButtonText("Test").onClick(async () => {
						const r = await this.plugin.apiProvider?.ping();
						new Notice(r?.ok ? `OK: ${r.message}` : `Failed: ${r?.message ?? "unknown"}`);
					})
				);
		}

		containerEl.createEl("h3", { text: "Hub & reading" });
		new Setting(containerEl)
			.setName("Scripture hub folder")
			.addText((t) =>
				t.setValue(this.plugin.settings.hubFolder).onChange(async (v) => {
					this.plugin.settings.hubFolder = v.trim() || "Scripture/Hub";
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Hub note per chapter")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.hubPerChapter).onChange(async (v) => {
					this.plugin.settings.hubPerChapter = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Normalize Logos paste")
			.setDesc("Rewrite pasted Logos URIs (logosres:, logos4:, logosft:) as Markdown links.")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.pasteNormalizeLogos).onChange(async (v) => {
					this.plugin.settings.pasteNormalizeLogos = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Auto-linkify references on paste")
			.setDesc(
				"When pasted text contains scripture references, wrap them as wikilinks to hub paths. Skips refs already inside links or code."
			)
			.addToggle((c) =>
				c.setValue(this.plugin.settings.pasteAutoLinkify).onChange(async (v) => {
					this.plugin.settings.pasteAutoLinkify = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Process ```passage code blocks in reading mode")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.passageCodeBlocks).onChange(async (v) => {
					this.plugin.settings.passageCodeBlocks = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Rich scripture & Strong’s in reading mode")
			.setDesc("Detects references in paragraphs (can affect Publish; see README).")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.readingProcessRefs).onChange(async (v) => {
					this.plugin.settings.readingProcessRefs = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Expand [!scripture] / [!bible] / [!passage] callouts")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.scriptureCallouts).onChange(async (v) => {
					this.plugin.settings.scriptureCallouts = v;
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Pedagogy" });
		new Setting(containerEl)
			.setName("Lectionary CSV path (in vault)")
			.setDesc("Columns: date,ref1,ref2,... ISO dates YYYY-MM-DD.")
			.addText((t) =>
				t.setValue(this.plugin.settings.lectionaryCsvPath).onChange(async (v) => {
					this.plugin.settings.lectionaryCsvPath = v.trim();
					await this.plugin.saveSettings();
					void this.plugin.loadLectionary();
				})
			);

		new Setting(containerEl)
			.setName("Interlinear / word-study notes folder")
			.setDesc("Used by command: open interlinear template path (create folder as needed).")
			.addText((t) =>
				t.setValue(this.plugin.settings.interlinearNotesPath).onChange(async (v) => {
					this.plugin.settings.interlinearNotesPath = v.trim() || "Scripture/Interlinear";
					await this.plugin.saveSettings();
				})
			);

		containerEl.createEl("h3", { text: "Passage sidebar" });
		new Setting(containerEl)
			.setName("Show ribbon button for passage pane")
			.addToggle((c) =>
				c.setValue(this.plugin.settings.showPassageRibbon).onChange(async (v) => {
					this.plugin.settings.showPassageRibbon = v;
					await this.plugin.saveSettings();
					this.plugin.refreshRibbon();
				})
			);
	}
}
