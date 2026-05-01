import { App, SuggestModal } from "obsidian";

export type BibleCatalogEntry = {
	id: string;
	name: string;
	abbreviation: string;
	language: string;
};

export class BiblePickerModal extends SuggestModal<BibleCatalogEntry> {
	constructor(
		app: App,
		private entries: BibleCatalogEntry[],
		private onPick: (entry: BibleCatalogEntry) => void
	) {
		super(app);
		this.setPlaceholder("Search by name, abbreviation, or language…");
	}

	getSuggestions(query: string): BibleCatalogEntry[] {
		const q = query.toLowerCase().trim();
		if (!q) return this.entries.slice(0, 200);
		return this.entries.filter((e) =>
			e.name.toLowerCase().includes(q) ||
			e.abbreviation.toLowerCase().includes(q) ||
			e.language.toLowerCase().includes(q) ||
			e.id.toLowerCase().includes(q)
		);
	}

	renderSuggestion(entry: BibleCatalogEntry, el: HTMLElement): void {
		el.createDiv({ text: entry.abbreviation ? `${entry.abbreviation} — ${entry.name}` : entry.name });
		const sub = el.createEl("small");
		sub.setText(`${entry.language || "?"} · id ${entry.id}`);
	}

	onChooseSuggestion(entry: BibleCatalogEntry, _evt: MouseEvent | KeyboardEvent): void {
		this.close();
		this.onPick(entry);
	}
}
