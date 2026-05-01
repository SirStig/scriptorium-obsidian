import { MarkdownView, Notice, SuggestModal, App } from "obsidian";

const GREEK: [string, string][] = [
	["α", "alpha"],
	["β", "beta"],
	["γ", "gamma"],
	["δ", "delta"],
	["ε", "epsilon"],
	["η", "eta"],
	["θ", "theta"],
	["ι", "iota"],
	["κ", "kappa"],
	["λ", "lambda"],
	["μ", "mu"],
	["ν", "nu"],
	["ξ", "xi"],
	["ο", "omicron"],
	["π", "pi"],
	["ρ", "rho"],
	["σ", "sigma"],
	["ς", "sigma final"],
	["τ", "tau"],
	["υ", "upsilon"],
	["φ", "phi"],
	["χ", "chi"],
	["ψ", "psi"],
	["ω", "omega"],
];

const HEBREW: [string, string][] = [
	["א", "aleph"],
	["ב", "bet"],
	["ג", "gimel"],
	["ד", "dalet"],
	["ה", "he"],
	["ו", "vav"],
	["ז", "zayin"],
	["ח", "chet"],
	["ט", "tet"],
	["י", "yod"],
	["כ", "kaf"],
	["ל", "lamed"],
	["מ", "mem"],
	["נ", "nun"],
	["ס", "samekh"],
	["ע", "ayin"],
	["פ", "pe"],
	["צ", "tsadi"],
	["ק", "qof"],
	["ר", "resh"],
	["ש", "shin"],
	["ת", "tav"],
	["\u200e", "LRM"],
	["\u200f", "RLM"],
];

export function openGreekPicker(app: App): void {
	new LetterInsertModal(app, GREEK, "Greek").open();
}

export function openHebrewPicker(app: App): void {
	new LetterInsertModal(app, HEBREW, "Hebrew").open();
}

class LetterInsertModal extends SuggestModal<[string, string]> {
	constructor(
		app: App,
		private pairs: [string, string][],
		private kind: string
	) {
		super(app);
		this.setPlaceholder(`Insert ${kind} character…`);
	}

	getSuggestions(query: string): [string, string][] {
		const q = query.toLowerCase();
		return this.pairs.filter(([, label]) => !q || label.toLowerCase().includes(q));
	}

	renderSuggestion([ch, label]: [string, string], el: HTMLElement): void {
		el.createDiv({ text: `${ch}  ${label}` });
	}

	onChooseSuggestion([ch]: [string, string], _e: MouseEvent | KeyboardEvent): void {
		this.close();
		const v = this.app.workspace.getActiveViewOfType(MarkdownView);
		const ed = v?.editor;
		if (ed) ed.replaceSelection(ch);
		else void navigator.clipboard.writeText(ch).then(() => new Notice("Copied to clipboard"));
	}
}
