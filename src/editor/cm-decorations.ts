import { EditorView, ViewPlugin, Decoration, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { parseReference } from "../reference/parser";
import { inlineRefRegex } from "../reference/regex";
import { sectionClassFor } from "../ui/section-styles";

type Hit = { from: number; to: number; sectionClass: string | null };

const baseMark = Decoration.mark({ class: "scriptorium-scripture-ref" });
const markCache = new Map<string, Decoration>();

function markFor(sectionClass: string | null): Decoration {
	if (!sectionClass) return baseMark;
	const cached = markCache.get(sectionClass);
	if (cached) return cached;
	const m = Decoration.mark({ class: `scriptorium-scripture-ref ${sectionClass}` });
	markCache.set(sectionClass, m);
	return m;
}

function scanLine(line: string, lineOffset: number, colorSection: boolean): Hit[] {
	const out: Hit[] = [];
	const re = inlineRefRegex("g");
	let m: RegExpExecArray | null;
	while ((m = re.exec(line)) !== null) {
		const slice = m[1]!;
		const parsed = parseReference(slice);
		const seg = parsed?.segments[0];
		if (!seg) continue;
		const sectionClass = colorSection ? sectionClassFor(seg.bookOsis) : null;
		out.push({ from: lineOffset + m.index, to: lineOffset + m.index + slice.length, sectionClass });
	}
	return out;
}

function buildDecorations(view: EditorView, colorSection: boolean) {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	const fromLine = doc.lineAt(view.viewport.from).number;
	const toLine = doc.lineAt(view.viewport.to).number;
	for (let n = fromLine; n <= toLine; n++) {
		const line = doc.line(n);
		for (const r of scanLine(line.text, line.from, colorSection)) {
			builder.add(r.from, r.to, markFor(r.sectionClass));
		}
	}
	return builder.finish();
}

class RefHighlighter {
	decorations: ReturnType<typeof buildDecorations>;
	private timer = 0;

	constructor(
		private view: EditorView,
		private debounceMs: number,
		private colorSection: boolean
	) {
		this.decorations = buildDecorations(view, colorSection);
	}

	update(u: ViewUpdate): void {
		if (!u.docChanged && !u.viewportChanged) return;
		if (u.viewportChanged && !u.docChanged) {
			window.clearTimeout(this.timer);
			this.decorations = buildDecorations(this.view, this.colorSection);
			return;
		}
		if (this.debounceMs <= 0) {
			window.clearTimeout(this.timer);
			this.decorations = buildDecorations(this.view, this.colorSection);
			return;
		}
		window.clearTimeout(this.timer);
		this.timer = window.setTimeout(() => {
			this.decorations = buildDecorations(this.view, this.colorSection);
			this.view.requestMeasure();
		}, this.debounceMs);
	}

	destroy(): void {
		window.clearTimeout(this.timer);
	}
}

export function createRefHighlightPlugin(debounceMs: number, colorSection: boolean) {
	return ViewPlugin.define(
		(view) => new RefHighlighter(view, debounceMs, colorSection),
		{ decorations: (v) => v.decorations }
	);
}
