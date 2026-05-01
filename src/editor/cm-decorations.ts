import { EditorView, ViewPlugin, Decoration, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { parseReference } from "../reference/parser";

const refMark = Decoration.mark({ class: "scriptorium-scripture-ref" });

function scanLine(line: string, lineOffset: number): { from: number; to: number }[] {
	const out: { from: number; to: number }[] = [];
	const re =
		/\b((?:[1-3]\s+)?[A-Za-z][A-Za-z'.]*(?:\s+[A-Za-z][A-Za-z'.]*){0,3}\s+\d+\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)\b/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(line)) !== null) {
		const slice = m[1]!;
		if (parseReference(slice)) {
			out.push({ from: lineOffset + m.index, to: lineOffset + m.index + slice.length });
		}
	}
	return out;
}

function buildDecorations(view: EditorView) {
	const builder = new RangeSetBuilder<Decoration>();
	const doc = view.state.doc;
	const fromLine = doc.lineAt(view.viewport.from).number;
	const toLine = doc.lineAt(view.viewport.to).number;
	for (let n = fromLine; n <= toLine; n++) {
		const line = doc.line(n);
		for (const r of scanLine(line.text, line.from)) {
			builder.add(r.from, r.to, refMark);
		}
	}
	return builder.finish();
}

class RefHighlighter {
	decorations: ReturnType<typeof buildDecorations>;
	private timer = 0;

	constructor(
		private view: EditorView,
		private debounceMs: number
	) {
		this.decorations = buildDecorations(view);
	}

	update(u: ViewUpdate): void {
		if (!u.docChanged && !u.viewportChanged) return;
		if (u.viewportChanged && !u.docChanged) {
			window.clearTimeout(this.timer);
			this.decorations = buildDecorations(this.view);
			return;
		}
		if (this.debounceMs <= 0) {
			window.clearTimeout(this.timer);
			this.decorations = buildDecorations(this.view);
			return;
		}
		window.clearTimeout(this.timer);
		this.timer = window.setTimeout(() => {
			this.decorations = buildDecorations(this.view);
			this.view.requestMeasure();
		}, this.debounceMs);
	}

	destroy(): void {
		window.clearTimeout(this.timer);
	}
}

export function createRefHighlightPlugin(debounceMs: number) {
	return ViewPlugin.define(
		(view) => new RefHighlighter(view, debounceMs),
		{ decorations: (v) => v.decorations }
	);
}
