import { describe, expect, it } from "vitest";
import { findStrongsTokens, formatStrongsUrl } from "../src/study/strongs";

describe("strongs", () => {
	it("finds G and H tokens", () => {
		const t = findStrongsTokens("Word (G26) and land H0776");
		expect(t.some((x) => x.kind === "G" && x.num === "26")).toBe(true);
		expect(t.some((x) => x.kind === "H" && x.num === "0776")).toBe(true);
	});

	it("builds lexicon urls", () => {
		expect(formatStrongsUrl("G", "26", "https://x/g", "https://x/h")).toBe("https://x/g26");
	});
});
