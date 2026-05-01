import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { parseReference, formatReferenceHuman } from "../reference/parser";
import { toNumericOsisString } from "../reference/osis";
import { STUDY_TYPES, type StudyType, fillTemplate } from "./types";
import type ScriptoriumPlugin from "../main";

/**
 * Modal that creates a new typed study note: pick a type, fill metadata,
 * land a templated note in the configured folder and open it.
 */
export class StudyNoteCreateModal extends Modal {
	private picked: StudyType = STUDY_TYPES[0]!;
	private titleVal = "";
	private passageVal = "";
	private dateVal = new Date().toISOString().slice(0, 10);
	private seriesVal = "";
	private folderVal = STUDY_TYPES[0]!.defaultFolder;
	private folderTouched = false;

	constructor(
		app: App,
		private plugin: ScriptoriumPlugin
	) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("scriptorium-studio-modal");
		contentEl.createEl("h2", { text: "New study note" });

		const typeRow = contentEl.createDiv({ cls: "scriptorium-studio-types" });
		for (const t of STUDY_TYPES) {
			const card = typeRow.createDiv({ cls: "scriptorium-studio-type-card" });
			card.dataset.typeId = t.id;
			if (t.id === this.picked.id) card.addClass("is-selected");
			card.createEl("strong", { text: t.label });
			card.createEl("p", { text: t.description });
			card.addEventListener("click", () => {
				this.picked = t;
				if (!this.folderTouched) {
					this.folderVal = t.defaultFolder;
					folderInput.setValue(this.folderVal);
				}
				typeRow.findAll(".scriptorium-studio-type-card").forEach((c) => c.removeClass("is-selected"));
				card.addClass("is-selected");
			});
		}

		new Setting(contentEl)
			.setName("Title")
			.addText((t) =>
				t.setPlaceholder("e.g. The good shepherd").onChange((v) => (this.titleVal = v))
			);

		new Setting(contentEl)
			.setName("Primary passage")
			.setDesc("Optional. Used in template + frontmatter.")
			.addText((t) =>
				t.setPlaceholder("e.g. John 10:1-18").onChange((v) => (this.passageVal = v))
			);

		new Setting(contentEl)
			.setName("Date")
			.addText((t) => t.setValue(this.dateVal).onChange((v) => (this.dateVal = v)));

		new Setting(contentEl)
			.setName("Series")
			.setDesc("Optional. For sermons or multi-part studies.")
			.addText((t) => t.onChange((v) => (this.seriesVal = v)));

		let folderInput!: { setValue: (v: string) => void };
		new Setting(contentEl)
			.setName("Folder")
			.setDesc("Where to create the note.")
			.addText((t) => {
				t.setValue(this.folderVal).onChange((v) => {
					this.folderVal = v;
					this.folderTouched = true;
				});
				folderInput = t;
			});

		const actions = contentEl.createDiv({ cls: "scriptorium-studio-actions" });
		const cancel = actions.createEl("button", { text: "Cancel" });
		cancel.addEventListener("click", () => this.close());
		const create = actions.createEl("button", {
			text: "Create",
			cls: "mod-cta",
		});
		create.addEventListener("click", () => void this.submit());
	}

	private async submit(): Promise<void> {
		if (!this.titleVal.trim()) {
			new Notice("Title is required.");
			return;
		}
		const date = /^\d{4}-\d{2}-\d{2}$/.test(this.dateVal)
			? this.dateVal
			: new Date().toISOString().slice(0, 10);

		let passageHuman = "";
		let passageId = "";
		if (this.passageVal.trim()) {
			const parsed = parseReference(this.passageVal);
			if (parsed) {
				passageHuman = formatReferenceHuman(parsed.segments);
				passageId = toNumericOsisString(parsed.segments);
			} else {
				passageHuman = this.passageVal.trim();
			}
		}

		const folder = (this.folderVal || this.picked.defaultFolder).replace(/\/$/, "");
		await ensureFolder(this.app, folder);

		const safeTitle = this.titleVal.replace(/[/\\:?*"<>|]/g, "-");
		const path = await uniquePath(this.app, `${folder}/${safeTitle}.md`);

		const body = fillTemplate(this.picked.template, {
			title: this.titleVal,
			passage: passageHuman,
			passageId,
			date,
			series: this.seriesVal,
		});

		const file = await this.app.vault.create(path, body);
		this.close();
		await this.app.workspace.openLinkText(file.path, "", true);
		new Notice(`Created ${this.picked.label}: ${file.path}`);
		void this.plugin;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

async function ensureFolder(app: App, path: string): Promise<void> {
	const parts = path.split("/").filter(Boolean);
	let acc = "";
	for (const p of parts) {
		acc = acc ? `${acc}/${p}` : p;
		if (!app.vault.getAbstractFileByPath(acc)) {
			await app.vault.createFolder(acc);
		}
	}
}

async function uniquePath(app: App, base: string): Promise<string> {
	if (!app.vault.getAbstractFileByPath(base)) return base;
	const m = base.match(/^(.*?)(\.md)$/);
	const stem = m ? m[1]! : base;
	const ext = m ? m[2]! : "";
	for (let i = 2; i < 1000; i++) {
		const candidate = `${stem} ${i}${ext}`;
		if (!app.vault.getAbstractFileByPath(candidate)) return candidate;
	}
	return base;
}

// Re-export for tests / future use
export { TFile };
