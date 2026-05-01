import { describe, expect, it } from "vitest";
import { inlineRefRegex } from "../src/reference/regex";

function findAll(text: string): string[] {
	const out: string[] = [];
	const re = inlineRefRegex("g");
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) out.push(m[1]!);
	return out;
}

describe("INLINE_REF regex", () => {
	it("captures classic refs", () => {
		expect(findAll("see John 3:16 and Rom 8:28 today")).toEqual(["John 3:16", "Rom 8:28"]);
	});

	it("captures verse ranges", () => {
		expect(findAll("read 1 Cor 13:4-7")).toEqual(["1 Cor 13:4-7"]);
	});

	it("captures chapter-only refs", () => {
		expect(findAll("read Genesis 1 tonight")).toEqual(["Genesis 1"]);
	});

	it("captures chapter ranges", () => {
		expect(findAll("read Romans 1-3 tonight")).toEqual(["Romans 1-3"]);
	});

	it("captures cross-chapter verse ranges", () => {
		expect(findAll("study John 3:16-4:2 carefully")).toEqual(["John 3:16-4:2"]);
	});

	it("captures verse-to-chapter ranges", () => {
		expect(findAll("study John 3:16-4 today")).toEqual(["John 3:16-4"]);
	});

	it("captures en-dash and em-dash ranges", () => {
		expect(findAll("read Acts 2–4 quickly")).toEqual(["Acts 2–4"]);
		expect(findAll("read Acts 2—4 quickly")).toEqual(["Acts 2—4"]);
	});

	it("captures multi-word book names", () => {
		expect(findAll("Song of Solomon 2:1 is great")).toEqual(["Song of Solomon 2:1"]);
	});

	it("captures numbered books", () => {
		expect(findAll("see 1 John 4:8 and 2 Peter 1:5")).toEqual(["1 John 4:8", "2 Peter 1:5"]);
	});
});
