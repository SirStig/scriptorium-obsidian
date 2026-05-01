import { beforeEach, describe, expect, it } from "vitest";
import { parseReference, passageToKey } from "../src/reference/parser";
import { configureCanon } from "../src/reference/books";
import { setOsisCompactExtras } from "../src/reference/osis";

beforeEach(() => {
	configureCanon(false, {});
	setOsisCompactExtras({});
});

describe("parseReference", () => {
	it("parses John 3:16", () => {
		const r = parseReference("John 3:16");
		expect(r).not.toBeNull();
		expect(r!.segments).toEqual([
			{ bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } },
		]);
	});

	it("parses dot OSIS style", () => {
		const r = parseReference("Jn.3.16");
		expect(r?.segments[0]).toMatchObject({
			bookOsis: "John",
			chapter: 3,
			verses: { start: 16, end: 16 },
		});
	});

	it("parses verse ranges", () => {
		const r = parseReference("1 Cor 13:4-7");
		expect(r?.segments[0]).toMatchObject({
			bookOsis: "1Cor",
			chapter: 13,
			verses: { start: 4, end: 7 },
		});
	});

	it("parses multiple semicolon-separated refs", () => {
		const r = parseReference("John 3:16; Rom 8:28");
		expect(r?.segments.length).toBe(2);
		expect(r?.segments[1]?.bookOsis).toBe("Rom");
	});

	it("parses abbreviated book names", () => {
		const r = parseReference("Jn 3:16");
		expect(r?.segments[0]?.bookOsis).toBe("John");
	});

	it("parses deuterocanon when enabled", () => {
		configureCanon(true, {});
		const r = parseReference("Tobit 1:3");
		expect(r?.segments[0]?.bookOsis).toBe("Tob");
	});

	it("returns null for garbage", () => {
		expect(parseReference("not a reference")).toBeNull();
	});
});

describe("passageToKey", () => {
	it("builds stable keys", () => {
		const r = parseReference("Ps 23:1");
		expect(r).not.toBeNull();
		expect(passageToKey(r!.segments[0]!)).toBe("Ps:23:1-1");
	});
});
