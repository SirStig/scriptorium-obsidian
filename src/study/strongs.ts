export function formatStrongsUrl(
	kind: "G" | "H",
	num: string,
	baseGreek: string,
	baseHebrew: string
): string {
	const n = num.replace(/^0+/, "") || num;
	const base = kind === "G" ? baseGreek : baseHebrew;
	return `${base}${n}`;
}

export function findStrongsTokens(text: string): { start: number; end: number; kind: "G" | "H"; num: string }[] {
	const out: { start: number; end: number; kind: "G" | "H"; num: string }[] = [];
	const re = /\b([GH])(\d{1,5})\b/gi;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		const kind = m[1]!.toUpperCase() === "G" ? "G" : "H";
		out.push({
			start: m.index,
			end: m.index + m[0].length,
			kind,
			num: m[2]!,
		});
	}
	return out;
}
