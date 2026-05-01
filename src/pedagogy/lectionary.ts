export type LectionaryRow = {
	date: string;
	refs: string[];
};

export function parseLectionaryCsv(text: string): LectionaryRow[] {
	const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
	const out: LectionaryRow[] = [];
	for (const line of lines) {
		if (/^\s*date\s*,/i.test(line)) continue;
		const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
		if (parts.length < 2) continue;
		const date = parts[0]!;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
		out.push({ date, refs: parts.slice(1).filter(Boolean) });
	}
	return out;
}

export function rowForDate(rows: LectionaryRow[], isoDate: string): LectionaryRow | null {
	return rows.find((r) => r.date === isoDate) ?? null;
}
