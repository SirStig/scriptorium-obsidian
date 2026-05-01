import { describe, expect, it } from "vitest";
import { outlineToMermaid } from "../src/studio/mermaid-outline";

describe("outlineToMermaid", () => {
	it("returns null when no headings present", () => {
		expect(outlineToMermaid("Just some prose, no headings.")).toBeNull();
	});

	it("produces a flowchart with the right number of nodes", () => {
		const body = "# Title\n\n## A\n\n## B\n\n### B.1\n";
		const out = outlineToMermaid(body)!;
		expect(out).toContain("```mermaid");
		expect(out).toContain("flowchart TD");
		// Four nodes total
		const nodeLines = out.split("\n").filter((l) => /^\s*n\d+\["/.test(l));
		expect(nodeLines.length).toBe(4);
	});

	it("links children to their nearest-shallower parent", () => {
		const body = "# T\n\n## A\n\n### A1\n\n## B\n";
		const out = outlineToMermaid(body)!;
		// T → A, T → B, A → A1
		const edges = out.split("\n").filter((l) => /-->/.test(l));
		expect(edges.length).toBe(3);
	});

	it("ignores headings inside fenced code blocks", () => {
		const body = "# Title\n\n```\n# Not a heading\n```\n\n## Real\n";
		const out = outlineToMermaid(body)!;
		const nodeLines = out.split("\n").filter((l) => /^\s*n\d+\["/.test(l));
		expect(nodeLines.length).toBe(2);
	});

	it("escapes quotes in headings", () => {
		const body = `# He said "hi"\n`;
		const out = outlineToMermaid(body)!;
		expect(out).toContain('\\"hi\\"');
	});
});
