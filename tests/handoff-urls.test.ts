import { beforeEach, describe, expect, it } from "vitest";
import {
	buildOliveTreeUrl,
	buildBibliaWebUrl,
	buildYouVersionUrl,
	buildAccordanceUrl,
	buildBibleGatewayUrl,
	buildBlueLetterBibleUrl,
	buildStepBibleUrl,
} from "../src/handoff/urls";
import { configureCanon } from "../src/reference/books";
import { setOsisCompactExtras } from "../src/reference/osis";
import type { PassageSegment } from "../src/reference/types";

beforeEach(() => {
	configureCanon(false, {});
	setOsisCompactExtras({});
});

const seg: PassageSegment = { bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } };
const range: PassageSegment = { bookOsis: "Rom", chapter: 8, verses: { start: 28, end: 30 } };

describe("Olive Tree URL", () => {
	it("uses Protestant book number", () => {
		expect(buildOliveTreeUrl("olivetree", seg)).toBe("olivetree://bible/43.3.16");
		expect(buildOliveTreeUrl("olivetree", range)).toMatch(/^olivetree:\/\/bible\/45\.8\.28$/);
	});
});

describe("biblia.com URL", () => {
	it("encodes translation and uses canonical book name", () => {
		expect(buildBibliaWebUrl("ESV", seg)).toBe("https://biblia.com/bible/ESV/John.3.16-16");
		expect(buildBibliaWebUrl("ESV", range)).toBe("https://biblia.com/bible/ESV/Romans.8.28-30");
	});
});

describe("YouVersion URL", () => {
	it("uses USFM ids", () => {
		expect(buildYouVersionUrl("111", seg)).toBe("https://www.bible.com/bible/111/JHN.3.16");
		expect(buildYouVersionUrl("1", range)).toBe("https://www.bible.com/bible/1/ROM.8.28-ROM.8.30");
	});
});

describe("Accordance URL", () => {
	it("encodes underscored book name", () => {
		expect(buildAccordanceUrl(seg)).toBe("accord://read?John_3%3A16");
		expect(buildAccordanceUrl(range)).toBe("accord://read?Romans_8%3A28-30");
	});
});

describe("BibleGateway URL", () => {
	it("uses + separators in book and ref", () => {
		expect(buildBibleGatewayUrl("ESV", seg)).toBe(
			"https://www.biblegateway.com/passage/?search=John+3:16&version=ESV"
		);
		expect(buildBibleGatewayUrl("KJV", range)).toBe(
			"https://www.biblegateway.com/passage/?search=Romans+8:28-30&version=KJV"
		);
	});
});

describe("Blue Letter Bible URL", () => {
	it("uses lowercased book and start verse", () => {
		expect(buildBlueLetterBibleUrl(seg)).toBe("https://www.blueletterbible.org/kjv/john/3/16");
	});
});

describe("STEP Bible URL", () => {
	it("uses dotted reference", () => {
		expect(buildStepBibleUrl(seg)).toBe(
			"https://www.stepbible.org/?q=reference=John.3.16"
		);
		expect(buildStepBibleUrl(range)).toBe(
			"https://www.stepbible.org/?q=reference=Romans.8.28-30"
		);
	});
});
