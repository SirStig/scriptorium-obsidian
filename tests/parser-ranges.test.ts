import { beforeEach, describe, expect, it } from "vitest";
import { parseReference } from "../src/reference/parser";
import { configureCanon } from "../src/reference/books";
import { setOsisCompactExtras } from "../src/reference/osis";

beforeEach(() => {
	configureCanon(false, {});
	setOsisCompactExtras({});
});

describe("parseReference — cross-chapter and complex ranges", () => {
	it("rejects a verse that exceeds the chapter's verse count", () => {
		expect(parseReference("John 3:42")).toBeNull();
	});

	it("clamps a range whose end exceeds the chapter's verse count", () => {
		const r = parseReference("John 3:30-50");
		expect(r?.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 30, end: 36 } },
		]);
	});

	it("parses cross-chapter verse ranges (A:B-C:D)", () => {
		const r = parseReference("John 3:16-4:2");
		expect(r?.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 16, end: 36 } },
			{ bookOsis: "John", chapter: 4, verses: { start: 1, end: 2 } },
		]);
	});

	it("parses chapter-only ranges (A-C)", () => {
		const r = parseReference("Romans 1-3");
		expect(r?.segments).toEqual([
			{ bookOsis: "Rom", chapter: 1, verses: { start: 1, end: 32 } },
			{ bookOsis: "Rom", chapter: 2, verses: { start: 1, end: 29 } },
			{ bookOsis: "Rom", chapter: 3, verses: { start: 1, end: 31 } },
		]);
	});

	it("parses chapter-range-with-partial-end (A-C:D)", () => {
		const r = parseReference("Genesis 1-2:3");
		expect(r?.segments).toEqual([
			{ bookOsis: "Gen", chapter: 1, verses: { start: 1, end: 31 } },
			{ bookOsis: "Gen", chapter: 2, verses: { start: 1, end: 3 } },
		]);
	});

	it("parses verse-to-chapter (A:B-C as cross-chapter when D missing? — kept single-chapter)", () => {
		// Convention: "John 3:16-4" is interpreted as verses 16-4 of chapter 3,
		// which clamps to {16-4} → start=16 end=max(16,4)=16 (just verse 16).
		// Cross-chapter requires explicit D ("3:16-4:1"). This matches common ref-parsers.
		const r = parseReference("John 3:16-4");
		expect(r?.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } },
		]);
	});

	it("parses comma-separated verse lists on the same chapter (A.3)", () => {
		const r = parseReference("John 3:16,18,20");
		expect(r?.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } },
			{ bookOsis: "John", chapter: 3, verses: { start: 18, end: 18 } },
			{ bookOsis: "John", chapter: 3, verses: { start: 20, end: 20 } },
		]);
	});

	it("parses comma-separated verse-range lists on the same chapter", () => {
		const r = parseReference("John 3:16-18,20-22");
		expect(r?.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 16, end: 18 } },
			{ bookOsis: "John", chapter: 3, verses: { start: 20, end: 22 } },
		]);
	});

	it("parses mixed comma list with chapter-and-verse change", () => {
		const r = parseReference("John 3:16,4:2");
		expect(r?.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } },
			{ bookOsis: "John", chapter: 4, verses: { start: 2, end: 2 } },
		]);
	});

	it("parses chapter-only refs (single chapter expanded to full)", () => {
		const r = parseReference("Genesis 1");
		expect(r?.segments).toEqual([
			{ bookOsis: "Gen", chapter: 1, verses: { start: 1, end: 31 } },
		]);
	});

	it("parses en-dash chapter ranges", () => {
		const r = parseReference("Romans 1–2");
		expect(r?.segments).toEqual([
			{ bookOsis: "Rom", chapter: 1, verses: { start: 1, end: 32 } },
			{ bookOsis: "Rom", chapter: 2, verses: { start: 1, end: 29 } },
		]);
	});
});
