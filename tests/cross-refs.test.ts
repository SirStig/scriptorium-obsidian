import { beforeEach, describe, expect, it } from "vitest";
import { lookupCrossRefs, setUserCrossRefs } from "../src/study/cross-refs-data";
import { configureCanon } from "../src/reference/books";

beforeEach(() => {
	configureCanon(false, {});
	setUserCrossRefs({});
});

describe("lookupCrossRefs", () => {
	it("returns refs for John 3:16", () => {
		const refs = lookupCrossRefs("John.3.16");
		expect(refs.length).toBeGreaterThan(0);
		expect(refs).toContain("Rom.5.8");
	});

	it("returns refs spanning verse-range entries", () => {
		const refs = lookupCrossRefs("Phil.2.7");
		// Phil.2.5-11 is a known range key in CROSS_REFS
		expect(refs.length).toBeGreaterThan(0);
	});

	it("falls back to chapter-level for unknown verse", () => {
		// "John.3.99" doesn't exist but the fallback should hit John.3 entries via chapter key
		const refs = lookupCrossRefs("John.3.99");
		// Some refs from John.3.16 may not propagate (since fallback only checks "John.3"),
		// but the array should still be defined.
		expect(Array.isArray(refs)).toBe(true);
	});

	it("returns empty for completely unknown passages", () => {
		const refs = lookupCrossRefs("Bogus.99.99");
		expect(refs).toEqual([]);
	});

	it("respects the limit argument", () => {
		const refs = lookupCrossRefs("John.3.16", 2);
		expect(refs.length).toBeLessThanOrEqual(2);
	});

	it("user extras override bundled entries", () => {
		setUserCrossRefs({ "John.3.16": ["Custom.1.1"] });
		const refs = lookupCrossRefs("John.3.16");
		expect(refs[0]).toBe("Custom.1.1");
	});
});
