import { describe, it, expect, beforeEach } from "vitest";
import { openExternalApp, buildLogosResUrl, formatLogosRefPassage } from "../src/handoff/urls";
import { configureCanon } from "../src/reference/books";
import { setOsisCompactExtras } from "../src/reference/osis";
import type { HandoffOpts } from "../src/handoff/types";

beforeEach(() => {
	configureCanon(false, {});
	setOsisCompactExtras({});
});

const logosHo: HandoffOpts = {
	scheme: "olivetree",
	translation: "ESV",
	youVersionId: "1",
	logosResourceAlias: "esv",
	logosRefPrefix: "BibleESV",
};

describe("Logos desktop handoff", () => {
	it("formats ref.passage like Faithlife ref.ly / logos link tokens", () => {
		expect(
			formatLogosRefPassage({ bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } })
		).toBe("Joh3.16");
		expect(
			formatLogosRefPassage({ bookOsis: "Rom", chapter: 8, verses: { start: 28, end: 30 } })
		).toBe("Rom8.28-30");
	});

	it("builds logosres URL when alias and prefix are set", () => {
		const seg = { bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } };
		expect(buildLogosResUrl(logosHo, seg)).toBe("logosres:esv;ref=BibleESV.Joh3.16");
		expect(openExternalApp("logos_uri", logosHo, seg)).toBe("logosres:esv;ref=BibleESV.Joh3.16");
	});

	it("returns null when Logos fields unset", () => {
		const empty: HandoffOpts = {
			scheme: "x",
			translation: "ESV",
			youVersionId: "1",
			logosResourceAlias: "",
			logosRefPrefix: "",
		};
		const seg = { bookOsis: "John", chapter: 3, verses: { start: 16, end: 16 } };
		expect(openExternalApp("logos_uri", empty, seg)).toBeNull();
	});
});
