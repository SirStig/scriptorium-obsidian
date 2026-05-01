import { MarkdownView, Notice, SuggestModal, App } from "obsidian";

type Pair = [string, string, string?]; // char, label, optional category

const GREEK_LETTERS: Pair[] = [
	["α", "alpha"], ["β", "beta"], ["γ", "gamma"], ["δ", "delta"],
	["ε", "epsilon"], ["ζ", "zeta"], ["η", "eta"], ["θ", "theta"],
	["ι", "iota"], ["κ", "kappa"], ["λ", "lambda"], ["μ", "mu"],
	["ν", "nu"], ["ξ", "xi"], ["ο", "omicron"], ["π", "pi"],
	["ρ", "rho"], ["σ", "sigma"], ["ς", "sigma final"],
	["τ", "tau"], ["υ", "upsilon"], ["φ", "phi"], ["χ", "chi"],
	["ψ", "psi"], ["ω", "omega"],
];

const GREEK_CAPS: Pair[] = [
	["Α", "Alpha"], ["Β", "Beta"], ["Γ", "Gamma"], ["Δ", "Delta"],
	["Ε", "Epsilon"], ["Ζ", "Zeta"], ["Η", "Eta"], ["Θ", "Theta"],
	["Ι", "Iota"], ["Κ", "Kappa"], ["Λ", "Lambda"], ["Μ", "Mu"],
	["Ν", "Nu"], ["Ξ", "Xi"], ["Ο", "Omicron"], ["Π", "Pi"],
	["Ρ", "Rho"], ["Σ", "Sigma"], ["Τ", "Tau"], ["Υ", "Upsilon"],
	["Φ", "Phi"], ["Χ", "Chi"], ["Ψ", "Psi"], ["Ω", "Omega"],
];

const GREEK_BREATHING: Pair[] = [
	["ἀ", "alpha smooth breathing"], ["ἁ", "alpha rough breathing"],
	["ἐ", "epsilon smooth breathing"], ["ἑ", "epsilon rough breathing"],
	["ἠ", "eta smooth breathing"], ["ἡ", "eta rough breathing"],
	["ἰ", "iota smooth breathing"], ["ἱ", "iota rough breathing"],
	["ὀ", "omicron smooth breathing"], ["ὁ", "omicron rough breathing"],
	["ὐ", "upsilon smooth breathing"], ["ὑ", "upsilon rough breathing"],
	["ὠ", "omega smooth breathing"], ["ὡ", "omega rough breathing"],
	["ῥ", "rho rough breathing"],
];

const GREEK_ACCENTS: Pair[] = [
	["ά", "alpha acute"], ["ὰ", "alpha grave"], ["ᾶ", "alpha circumflex"],
	["έ", "epsilon acute"], ["ὲ", "epsilon grave"],
	["ή", "eta acute"], ["ὴ", "eta grave"], ["ῆ", "eta circumflex"],
	["ί", "iota acute"], ["ὶ", "iota grave"], ["ῖ", "iota circumflex"],
	["ό", "omicron acute"], ["ὸ", "omicron grave"],
	["ύ", "upsilon acute"], ["ὺ", "upsilon grave"], ["ῦ", "upsilon circumflex"],
	["ώ", "omega acute"], ["ὼ", "omega grave"], ["ῶ", "omega circumflex"],
];

const GREEK_IOTA_SUBSCRIPT: Pair[] = [
	["ᾳ", "alpha iota subscript"],
	["ῃ", "eta iota subscript"],
	["ῳ", "omega iota subscript"],
	["ᾷ", "alpha iota subscript circumflex"],
	["ῇ", "eta iota subscript circumflex"],
	["ῷ", "omega iota subscript circumflex"],
];

const GREEK_PUNCT: Pair[] = [
	["·", "ano teleia (high stop)"],
	[";", "Greek question mark (erotimatiko)"],
	["—", "em dash"],
	["…", "ellipsis"],
];

const GREEK: Pair[] = [
	...GREEK_LETTERS.map((p): Pair => [p[0], p[1], "letters"]),
	...GREEK_CAPS.map((p): Pair => [p[0], p[1], "capitals"]),
	...GREEK_BREATHING.map((p): Pair => [p[0], p[1], "breathing"]),
	...GREEK_ACCENTS.map((p): Pair => [p[0], p[1], "accents"]),
	...GREEK_IOTA_SUBSCRIPT.map((p): Pair => [p[0], p[1], "iota subscript"]),
	...GREEK_PUNCT.map((p): Pair => [p[0], p[1], "punctuation"]),
];

const HEBREW_LETTERS: Pair[] = [
	["א", "aleph"], ["ב", "bet"], ["ג", "gimel"], ["ד", "dalet"],
	["ה", "he"], ["ו", "vav"], ["ז", "zayin"], ["ח", "chet"],
	["ט", "tet"], ["י", "yod"], ["כ", "kaf"], ["ך", "kaf final"],
	["ל", "lamed"], ["מ", "mem"], ["ם", "mem final"],
	["נ", "nun"], ["ן", "nun final"],
	["ס", "samekh"], ["ע", "ayin"], ["פ", "pe"], ["ף", "pe final"],
	["צ", "tsadi"], ["ץ", "tsadi final"],
	["ק", "qof"], ["ר", "resh"], ["ש", "shin"], ["ת", "tav"],
];

const HEBREW_NIQQUD: Pair[] = [
	["ַ", "patach (combining)"],
	["ָ", "qamats (combining)"],
	["ֵ", "tsere (combining)"],
	["ֶ", "segol (combining)"],
	["ִ", "hiriq (combining)"],
	["ֹ", "holam (combining)"],
	["ֻ", "qubuts (combining)"],
	["ְ", "shva (combining)"],
	["ֲ", "hataf patach (combining)"],
	["ֱ", "hataf segol (combining)"],
	["ֳ", "hataf qamats (combining)"],
	["ּ", "dagesh / shuruq dot (combining)"],
	["ׁ", "shin dot (combining, on right)"],
	["ׂ", "sin dot (combining, on left)"],
];

const HEBREW_PUNCT: Pair[] = [
	["־", "maqaf"],
	["׃", "sof pasuq"],
	["׳", "geresh"],
	["״", "gershayim"],
	["׀", "paseq"],
	["‎", "LRM (left-to-right mark)"],
	["‏", "RLM (right-to-left mark)"],
];

const HEBREW: Pair[] = [
	...HEBREW_LETTERS.map((p): Pair => [p[0], p[1], "letters"]),
	...HEBREW_NIQQUD.map((p): Pair => [p[0], p[1], "niqqud"]),
	...HEBREW_PUNCT.map((p): Pair => [p[0], p[1], "punctuation"]),
];

export function openGreekPicker(app: App): void {
	new LetterInsertModal(app, GREEK, "Greek", "grc").open();
}

export function openHebrewPicker(app: App): void {
	new LetterInsertModal(app, HEBREW, "Hebrew", "hbo").open();
}

class LetterInsertModal extends SuggestModal<Pair> {
	constructor(
		app: App,
		private pairs: Pair[],
		private kind: string,
		private langTag: string
	) {
		super(app);
		this.setPlaceholder(`Insert ${kind} character — search by name, e.g. "alpha acute"`);
	}

	getSuggestions(query: string): Pair[] {
		const q = query.toLowerCase().trim();
		if (!q) return this.pairs;
		return this.pairs.filter(
			(p) => p[1].toLowerCase().includes(q) || (p[2] ?? "").toLowerCase().includes(q)
		);
	}

	renderSuggestion([ch, label, category]: Pair, el: HTMLElement): void {
		el.addClass("scriptorium-charpicker-item");
		const big = el.createSpan({ cls: "scriptorium-charpicker-glyph" });
		big.setAttr("lang", this.langTag);
		big.textContent = ch;
		const meta = el.createDiv({ cls: "scriptorium-charpicker-meta" });
		meta.createDiv({ text: label });
		if (category) meta.createDiv({ cls: "scriptorium-charpicker-cat", text: category });
	}

	onChooseSuggestion([ch]: Pair, _e: MouseEvent | KeyboardEvent): void {
		this.close();
		const v = this.app.workspace.getActiveViewOfType(MarkdownView);
		const ed = v?.editor;
		if (ed) ed.replaceSelection(ch);
		else void navigator.clipboard.writeText(ch).then(() => new Notice("Copied to clipboard"));
	}
}
