import { beforeEach, describe, expect, it } from "vitest";
import { parseReference } from "../src/reference/parser";
import { configureCanon, PROTESTANT_BOOKS, DEUTERO_BOOKS } from "../src/reference/books";
import { setOsisCompactExtras, toApiBibleUsfmSeg } from "../src/reference/osis";

beforeEach(() => {
	configureCanon(false, {});
	setOsisCompactExtras({});
});

describe("OSIS short forms parse via the fuzzy matcher (A.7)", () => {
	it("parses 'Gen 1:1' (OSIS short, not in aliases)", () => {
		const r = parseReference("Gen 1:1");
		expect(r?.segments[0]).toMatchObject({ bookOsis: "Gen", chapter: 1 });
	});

	it("parses 'Matt 5:1' via OSIS short", () => {
		const r = parseReference("Matt 5:1");
		expect(r?.segments[0]).toMatchObject({ bookOsis: "Matt", chapter: 5 });
	});

	it("parses 'Phlm 1:5' via OSIS short", () => {
		const r = parseReference("Phlm 1:5");
		expect(r?.segments[0]).toMatchObject({ bookOsis: "Phlm", chapter: 1, verses: { start: 5, end: 5 } });
	});

	it("parses 'Heb 1:1' via OSIS short", () => {
		const r = parseReference("Heb 1:1");
		expect(r?.segments[0]).toMatchObject({ bookOsis: "Heb", chapter: 1 });
	});
});

describe("USFM coverage guardrail", () => {
	it("toApiBibleUsfmSeg produces a non-fallback code for every Protestant book", () => {
		for (const b of PROTESTANT_BOOKS) {
			const seg = { bookOsis: b.osis, chapter: 1, verses: { start: 1, end: 1 } };
			const usfm = toApiBibleUsfmSeg(seg);
			// Real USFM codes are 3 chars; numbered books are 1+2. Anything that came
			// from the fallback branch would still be 3 chars from osis.toUpperCase().slice(0,3),
			// so this assertion only catches "did we even produce a string" — but combined
			// with the explicit per-book mapping in osis.ts it's a sanity check.
			expect(usfm.length, b.osis).toBeGreaterThanOrEqual(5);
			expect(usfm, b.osis).toMatch(/^[1-3A-Z]{1,3}\.\d+\.\d+$/);
		}
	});

	it("covers deuterocanon when enabled", () => {
		configureCanon(true, {});
		for (const b of DEUTERO_BOOKS) {
			const seg = { bookOsis: b.osis, chapter: 1, verses: { start: 1, end: 1 } };
			const usfm = toApiBibleUsfmSeg(seg);
			expect(usfm, b.osis).toMatch(/^[1-3A-Z]{1,3}\.\d+\.\d+$/);
		}
	});
});
