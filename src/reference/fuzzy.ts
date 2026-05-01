import type { BookRecord } from "./types";

export type BookMatch = {
	book: BookRecord;
	score: number;
};

let activeList: BookRecord[] = [];

const BOOK_CANDIDATES: { book: BookRecord; pattern: string; len: number }[] = [];

function normalize(s: string): string {
	return s.trimEnd().replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	if (m === 0) return n;
	if (n === 0) return m;
	const dp = new Array<number>(n + 1);
	for (let j = 0; j <= n; j++) dp[j] = j;
	for (let i = 1; i <= m; i++) {
		let prev = dp[0]!;
		dp[0] = i;
		for (let j = 1; j <= n; j++) {
			const tmp = dp[j]!;
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
			prev = tmp;
		}
	}
	return dp[n]!;
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function syncFuzzyBooks(books: BookRecord[], aliasOverrides: Record<string, string> = {}): void {
	activeList = books;
	BOOK_CANDIDATES.length = 0;
	for (const book of books) {
		const labels = [book.osis, book.name, ...book.aliases];
		for (const label of labels) {
			const p = escapeRegExp(label).replace(/ /g, "\\s+");
			BOOK_CANDIDATES.push({
				book,
				pattern: `(?:^|(?<=\\s))${p}(?=\\s|$|[\\d.:;])`,
				len: label.length,
			});
		}
	}
	for (const [alias, osis] of Object.entries(aliasOverrides)) {
		const book = books.find((b) => b.osis === osis);
		if (!book) continue;
		const p = escapeRegExp(alias).replace(/ /g, "\\s+");
		BOOK_CANDIDATES.push({
			book,
			pattern: `(?:^|(?<=\\s))${p}(?=\\s|$|[\\d.:;])`,
			len: alias.length,
		});
	}
	BOOK_CANDIDATES.sort((a, b) => b.len - a.len);
}

export function matchBookPrefix(input: string): { book: BookRecord; start: number; end: number } | null {
	const s = normalize(input);
	for (const c of BOOK_CANDIDATES) {
		const re = new RegExp(c.pattern, "i");
		const m = s.match(re);
		if (m && m.index !== undefined) {
			const start = m.index;
			const end = start + m[0].length;
			const after = s.slice(end).trimStart();
			if (after.length === 0 || /^[\d.:;\-–—]/.test(after)) {
				return { book: c.book, start, end };
			}
		}
	}
	return null;
}

export function fuzzyBooks(query: string, limit = 12): BookMatch[] {
	const q = normalize(query).toLowerCase();
	if (!q) {
		return activeList.slice(0, limit).map((book) => ({ book, score: 0 }));
	}
	const out: BookMatch[] = [];
	for (const book of activeList) {
		const name = book.name.toLowerCase();
		let score = 1000;
		if (name.startsWith(q) || name.includes(q)) {
			score = name.startsWith(q) ? 0 : 10;
		} else {
			const bestAlias = Math.min(
				...book.aliases.map((a) => {
					const al = a.toLowerCase();
					if (al.startsWith(q) || al.includes(q)) return al.startsWith(q) ? 2 : 12;
					return levenshtein(q, al.length <= 12 ? al : al.slice(0, 12)) + 20;
				})
			);
			const distName = levenshtein(q, name.length <= 16 ? name : name.slice(0, 16));
			score = Math.min(score, bestAlias, distName + 5);
		}
		out.push({ book, score });
	}
	out.sort((a, b) => a.score - b.score);
	return out.slice(0, limit);
}
