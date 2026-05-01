import { beforeEach, describe, expect, it } from "vitest";
import { maxVerseForChapter, totalChaptersForBook } from "../src/reference/verse-limits";
import { VERSE_COUNTS } from "../src/reference/verse-data";
import { configureCanon, PROTESTANT_BOOKS, DEUTERO_BOOKS } from "../src/reference/books";

beforeEach(() => {
	configureCanon(false, {});
});

describe("maxVerseForChapter", () => {
	it("returns the right max for well-known chapters", () => {
		expect(maxVerseForChapter("Gen", 1)).toBe(31);
		expect(maxVerseForChapter("John", 3)).toBe(36);
		expect(maxVerseForChapter("Ps", 23)).toBe(6);
		expect(maxVerseForChapter("Ps", 117)).toBe(2);
		expect(maxVerseForChapter("Ps", 119)).toBe(176);
		expect(maxVerseForChapter("Rev", 22)).toBe(21);
		expect(maxVerseForChapter("Obad", 1)).toBe(21);
		expect(maxVerseForChapter("Phlm", 1)).toBe(25);
		expect(maxVerseForChapter("3John", 1)).toBe(14);
		expect(maxVerseForChapter("Jude", 1)).toBe(25);
	});

	it("falls back to 60 for unknown books / out-of-range chapters", () => {
		expect(maxVerseForChapter("Bogus", 1)).toBe(60);
		expect(maxVerseForChapter("John", 99)).toBe(60);
	});

	it("knows deuterocanon chapters", () => {
		expect(maxVerseForChapter("Tob", 1)).toBe(22);
		expect(maxVerseForChapter("Sir", 51)).toBe(30);
	});
});

describe("totalChaptersForBook", () => {
	it("matches BookRecord chapter counts for the active canon", () => {
		for (const b of PROTESTANT_BOOKS) {
			expect(totalChaptersForBook(b.osis), b.osis).toBe(b.chapters);
		}
	});

	it("matches BookRecord chapter counts for the deuterocanon", () => {
		for (const b of DEUTERO_BOOKS) {
			expect(totalChaptersForBook(b.osis), b.osis).toBe(b.chapters);
		}
	});
});

describe("VERSE_COUNTS data integrity", () => {
	it("has a verse-count array length equal to BookRecord.chapters for every Protestant book", () => {
		for (const b of PROTESTANT_BOOKS) {
			const counts = VERSE_COUNTS[b.osis];
			expect(counts, b.osis).toBeDefined();
			expect(counts!.length, b.osis).toBe(b.chapters);
			for (let i = 0; i < counts!.length; i++) {
				expect(counts![i], `${b.osis} ch ${i + 1}`).toBeGreaterThan(0);
			}
		}
	});

	it("has the same coverage for the deuterocanon", () => {
		for (const b of DEUTERO_BOOKS) {
			const counts = VERSE_COUNTS[b.osis];
			expect(counts, b.osis).toBeDefined();
			expect(counts!.length, b.osis).toBe(b.chapters);
		}
	});
});
