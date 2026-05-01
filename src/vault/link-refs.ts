import { parseReference } from "../reference/parser";
import { hubRelPath } from "./hub";

const INLINE_REF =
	/\b((?:[1-3]\s+)?[A-Za-z][A-Za-z'.]*(?:\s+[A-Za-z][A-Za-z'.]*){0,3}\s+\d+\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)\b/g;

export function linkRefsInMarkdown(body: string, hubFolder: string, perChapter: boolean): string {
	return body.replace(INLINE_REF, (slice) => {
		const p = parseReference(slice);
		if (!p) return slice;
		const seg = p.segments[0]!;
		const path = hubRelPath(hubFolder, perChapter, seg);
		return `[[${path}|${slice}]]`;
	});
}
