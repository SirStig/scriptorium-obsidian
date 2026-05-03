import { parseReference } from "../reference/parser";
import { matchBookPrefix } from "../reference/fuzzy";
import { inlineRefRegex } from "../reference/regex";
import { hubRelPath } from "./hub-paths";

type Span = { start: number; end: number };

function findProtectedSpans(body: string): Span[] {
	const spans: Span[] = [];
	const wikilink = /\[\[[^\]]*\]\]/g;
	const mdLink = /\[[^\]]*\]\([^)]*\)/g;
	const fenced = /```[\s\S]*?```/g;
	const inlineCode = /`[^`\n]+`/g;
	for (const re of [fenced, wikilink, mdLink, inlineCode]) {
		let m: RegExpExecArray | null;
		while ((m = re.exec(body)) !== null) {
			spans.push({ start: m.index, end: m.index + m[0].length });
		}
	}
	return spans;
}

function inSpan(pos: number, spans: Span[]): boolean {
	for (const s of spans) {
		if (pos >= s.start && pos < s.end) return true;
	}
	return false;
}

export function linkRefsInMarkdown(body: string, hubFolder: string, perChapter: boolean): string {
	const protect = findProtectedSpans(body);
	const re = inlineRefRegex("g");
	let out = "";
	let cursor = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(body)) !== null) {
		const slice = m[1]!;
		const matchStart = m.index;
		const book = matchBookPrefix(slice);
		if (!book) continue;
		const trueStart = matchStart + book.start;
		const trueSlice = slice.slice(book.start);
		if (inSpan(trueStart, protect)) continue;
		const p = parseReference(trueSlice);
		if (!p?.segments[0]) continue;
		out += body.slice(cursor, trueStart);
		const seg = p.segments[0];
		const path = hubRelPath(hubFolder, perChapter, seg);
		out += `[[${path}|${trueSlice}]]`;
		cursor = trueStart + trueSlice.length;
	}
	out += body.slice(cursor);
	return out;
}
