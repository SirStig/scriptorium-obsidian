import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ScriptoriumPlugin from "./main";

export type ExternalApp =
	| "olivetree"
	| "logos_uri"
	| "biblia_web"
	| "youversion"
	| "accordance"
	| "none";

export type TextProviderMode = "none" | "vault_folder" | "api_bible";

export interface ScriptoriumSettings {
	suggestTrigger: string;
	highlightInlineRefs: boolean;
	editorHighlightDebounceMs: number;
	openApp: ExternalApp;
	olivetreeScheme: string;
	bibliaTranslation: string;
	youVersionBibleId: string;
	textProvider: TextProviderMode;
	vaultBibleFolder: string;
	apiBibleKey: string;
	apiBibleTranslation: string;
	hubFolder: string;
	hubPerChapter: boolean;
	pasteNormalizeLogos: boolean;
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
}

export const DEFAULT_SETTINGS: ScriptoriumSettings = {
	suggestTrigger: "/ref",
	highlightInlineRefs: true,
	editorHighlightDebounceMs: 120,
	openApp: "olivetree",
	olivetreeScheme: "olivetree",
	bibliaTranslation: "ESV",
	youVersionBibleId: "111",
	textProvider: "none",
	vaultBibleFolder: "Scripture/Text",
	apiBibleKey: "",
	apiBibleTranslation: "",
	hubFolder: "Scripture/Hub",
	hubPerChapter: true,
	pasteNormalizeLogos: true,
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
			.addDropdown((d) =>
				d
					.addOption("none", "References only")
					.addOption("vault_folder", "Vault folder")
					.addOption("api_bible", "API.Bible")
					.setValue(this.plugin.settings.textProvider)
					.onChange(async (v) => {
						this.plugin.settings.textProvider = v as TextProviderMode;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Vault Bible folder")
			.addText((t) =>
				t.setValue(this.plugin.settings.vaultBibleFolder).onChange(async (v) => {
					this.plugin.settings.vaultBibleFolder = v.trim();
					await this.plugin.saveSettings();
					this.plugin.refreshProviders();
				})
			);

		new Setting(containerEl)
			.setName("API.Bible key")
			.addText((t) => {
				t.inputEl.type = "password";
				t.setValue(this.plugin.settings.apiBibleKey).onChange(async (v) => {
					this.plugin.settings.apiBibleKey = v;
					await this.plugin.saveSettings();
					this.plugin.refreshProviders();
				});
			});

		new Setting(containerEl)
			.setName("API.Bible Bible id")
			.addText((t) =>
				t.setValue(this.plugin.settings.apiBibleTranslation).onChange(async (v) => {
					this.plugin.settings.apiBibleTranslation = v.trim();
					await this.plugin.saveSettings();
					this.plugin.refreshProviders();
				})
			);

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
			.addToggle((c) =>
				c.setValue(this.plugin.settings.pasteNormalizeLogos).onChange(async (v) => {
					this.plugin.settings.pasteNormalizeLogos = v;
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
