/**
 * Convert a sermon (or any heading-structured note) into a Mermaid flowchart.
 *
 * Top-level (H1) is the title node; H2s are level-1 children of the title;
 * H3s are children of their preceding H2; deeper headings flatten under the
 * nearest H2 to keep the diagram readable. Output is wrapped in a fenced
 * ```mermaid block ready to drop into a note.
 */

type Node = { id: string; label: string; depth: number; parent: string };

export function outlineToMermaid(body: string): string | null {
	const lines = body.split(/\r?\n/);
	const headings: { depth: number; text: string }[] = [];
	let inFence = false;
	for (const raw of lines) {
		if (/^```/.test(raw)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const m = raw.match(/^(#{1,6})\s+(.*?)\s*$/);
		if (!m) continue;
		const depth = m[1]!.length;
		const text = m[2]!.replace(/[`*_]+/g, "").trim();
		if (text) headings.push({ depth, text });
	}
	if (headings.length === 0) return null;

	const nodes: Node[] = [];
	const stack: { id: string; depth: number }[] = [];
	let counter = 0;
	const id = (): string => `n${++counter}`;

	for (const h of headings) {
		while (stack.length && stack[stack.length - 1]!.depth >= h.depth) stack.pop();
		const parent = stack.length ? stack[stack.length - 1]!.id : "";
		const myId = id();
		nodes.push({ id: myId, label: h.text, depth: h.depth, parent });
		stack.push({ id: myId, depth: h.depth });
	}

	const out: string[] = [];
	out.push("```mermaid");
	out.push("flowchart TD");
	for (const n of nodes) {
		const safe = n.label.replace(/"/g, '\\"');
		out.push(`    ${n.id}["${safe}"]`);
	}
	for (const n of nodes) {
		if (n.parent) out.push(`    ${n.parent} --> ${n.id}`);
	}
	out.push("```");
	return out.join("\n");
}
