import { beforeEach, describe, expect, it } from "vitest";
import { linkRefsInMarkdown } from "../src/vault/link-refs";
import { configureCanon } from "../src/reference/books";

beforeEach(() => {
	configureCanon(false, {});
});

describe("linkRefsInMarkdown", () => {
	it("wraps a bare reference into a hub wikilink", () => {
		const out = linkRefsInMarkdown("See John 3:16 today", "Scripture/Hub", true);
		expect(out).toContain("[[Scripture/Hub/John/ch-3.md|John 3:16]]");
	});

	it("is idempotent — re-running does not double-wrap existing wikilinks", () => {
		const once = linkRefsInMarkdown("See John 3:16 today", "Scripture/Hub", true);
		const twice = linkRefsInMarkdown(once, "Scripture/Hub", true);
		expect(twice).toBe(once);
	});

	it("leaves refs inside markdown links alone", () => {
		const input = "Click [John 3:16](https://example.com/jn-3-16) here";
		const out = linkRefsInMarkdown(input, "Scripture/Hub", true);
		expect(out).toBe(input);
	});

	it("leaves refs inside inline code alone", () => {
		const input = "Pattern: `John 3:16` is a ref";
		const out = linkRefsInMarkdown(input, "Scripture/Hub", true);
		expect(out).toBe(input);
	});

	it("leaves refs inside fenced code blocks alone", () => {
		const input = "```\nJohn 3:16\n```\nbut wraps John 3:17 outside";
		const out = linkRefsInMarkdown(input, "Scripture/Hub", true);
		expect(out).toContain("```\nJohn 3:16\n```");
		expect(out).toContain("[[Scripture/Hub/John/ch-3.md|John 3:17]]");
	});

	it("wraps multiple distinct refs", () => {
		const out = linkRefsInMarkdown("Compare John 3:16 with Rom 8:28", "Scripture/Hub", true);
		expect(out).toContain("[[Scripture/Hub/John/ch-3.md|John 3:16]]");
		expect(out).toContain("[[Scripture/Hub/Romans/ch-8.md|Rom 8:28]]");
	});
});
