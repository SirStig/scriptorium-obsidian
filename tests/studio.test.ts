import { beforeEach, describe, expect, it } from "vitest";
import { exportToSlides } from "../src/studio/slide-export";
import { indexPassagesInFrontmatter } from "../src/studio/index-passages";
import { fillTemplate, STUDY_TYPES, getStudyType } from "../src/studio/types";
import { configureCanon } from "../src/reference/books";
import { setOsisCompactExtras } from "../src/reference/osis";

beforeEach(() => {
	configureCanon(false, {});
	setOsisCompactExtras({});
});

describe("exportToSlides", () => {
	it("inserts --- before each H2", () => {
		const body = "# Title\n\nintro\n\n## First\n\nbody1\n\n## Second\n\nbody2\n";
		const out = exportToSlides(body);
		expect(out).toContain("# Title");
		expect(out.match(/^---$/gm)?.length).toBeGreaterThanOrEqual(2);
		expect(out).toContain("## First");
		expect(out).toContain("## Second");
	});

	it("preserves frontmatter when present", () => {
		const body = "---\ntitle: Test\n---\n# Slide one\n\n## Slide two\n";
		const out = exportToSlides(body);
		expect(out.startsWith("---\ntitle: Test\n---")).toBe(true);
	});

	it("strips frontmatter when asked", () => {
		const body = "---\ntitle: Test\n---\n# Slide one\n";
		const out = exportToSlides(body, { stripFrontmatter: true });
		expect(out.includes("title: Test")).toBe(false);
	});

	it("respects custom slide level", () => {
		const body = "# T\n\n## A\n### A1\n## B\n";
		const outAtH3 = exportToSlides(body, { slideLevel: 3 });
		// Three slide breaks: before ##A, before ###A1, before ##B
		expect(outAtH3.match(/^---$/gm)?.length).toBe(3);
	});
});

describe("indexPassagesInFrontmatter", () => {
	it("resolves block-list passages: into passages_resolved:", () => {
		const body = `---
title: Test
passages:
  - "John 3:16"
  - "Rom 8:28"
---
body
`;
		const out = indexPassagesInFrontmatter(body);
		expect(out).not.toBeNull();
		expect(out!).toContain('passages_resolved: ["John.3.16", "Rom.8.28"]');
		expect(out!).toContain("body");
	});

	it("resolves inline-list passages:", () => {
		const body = `---
passages: ["John 3:16", "Rom 8:28"]
---
`;
		const out = indexPassagesInFrontmatter(body);
		expect(out).not.toBeNull();
		expect(out!).toContain("passages_resolved:");
	});

	it("returns null when no passages: field exists", () => {
		const body = `---
title: Test
---
body
`;
		expect(indexPassagesInFrontmatter(body)).toBeNull();
	});

	it("is idempotent", () => {
		const body = `---
passages:
  - "John 3:16"
---
`;
		const once = indexPassagesInFrontmatter(body);
		expect(once).not.toBeNull();
		const twice = indexPassagesInFrontmatter(once!);
		expect(twice).toBe(once);
	});

	it("skips unparseable entries silently", () => {
		const body = `---
passages:
  - "John 3:16"
  - "not a ref"
---
`;
		const out = indexPassagesInFrontmatter(body);
		expect(out).not.toBeNull();
		expect(out!).toContain('passages_resolved: ["John.3.16"]');
	});
});

describe("Study types & template fill", () => {
	it("has a non-empty registry", () => {
		expect(STUDY_TYPES.length).toBeGreaterThan(0);
		for (const t of STUDY_TYPES) {
			expect(t.template).toContain("{{title}}");
		}
	});

	it("looks up by id", () => {
		expect(getStudyType("sermon")?.label).toBe("Sermon");
		expect(getStudyType("lectio")?.label).toBe("Lectio Divina");
	});

	it("fills template placeholders", () => {
		const tpl = "# {{title}} — {{passage}} ({{date}})";
		const filled = fillTemplate(tpl, {
			title: "Hello",
			passage: "John 3:16",
			passageId: "John.3.16",
			date: "2026-01-01",
			series: "",
		});
		expect(filled).toBe("# Hello — John 3:16 (2026-01-01)");
	});
});
