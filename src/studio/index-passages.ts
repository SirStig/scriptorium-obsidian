import { parseReference } from "../reference/parser";
import { toNumericOsisString } from "../reference/osis";

/**
 * Resolve the `passages:` frontmatter list into canonical OSIS keys, written
 * back as `passages_resolved:`. Idempotent — re-running on a note with no
 * unresolved entries leaves the body unchanged.
 *
 * Returns the rewritten body, or null if the note had no `passages:` array
 * (so the caller can show a Notice).
 */
export function indexPassagesInFrontmatter(body: string): string | null {
	const fmMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!fmMatch) return null;
	const fm = fmMatch[1]!;
	const fmEnd = fmMatch[0].length;

	const passagesEntries = extractListField(fm, "passages");
	if (!passagesEntries) return null;

	const resolved: string[] = [];
	for (const raw of passagesEntries) {
		const stripped = raw.replace(/^["']|["']$/g, "").trim();
		if (!stripped) continue;
		const parsed = parseReference(stripped);
		if (!parsed) continue;
		const osis = toNumericOsisString(parsed.segments);
		if (osis) resolved.push(osis);
	}

	const newFm = upsertListField(fm, "passages_resolved", resolved);
	if (newFm === fm) return body;
	return `---\n${newFm}\n---\n${body.slice(fmEnd)}`;
}

/**
 * Read a YAML list field. Supports two YAML shapes:
 *   key: [a, b, c]
 *   key:
 *     - a
 *     - b
 *
 * Returns null when the field isn't present.
 */
function extractListField(fm: string, key: string): string[] | null {
	const lines = fm.split(/\r?\n/);
	const inlineRe = new RegExp(`^${key}\\s*:\\s*\\[([^\\]]*)\\]\\s*$`);
	const blockHeadRe = new RegExp(`^${key}\\s*:\\s*$`);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		const inline = line.match(inlineRe);
		if (inline) {
			return inline[1]!.split(",").map((s) => s.trim()).filter(Boolean);
		}
		if (blockHeadRe.test(line)) {
			const items: string[] = [];
			for (let j = i + 1; j < lines.length; j++) {
				const m = lines[j]!.match(/^\s*-\s+(.*)$/);
				if (!m) break;
				items.push(m[1]!.trim());
			}
			return items;
		}
	}
	return null;
}

/**
 * Replace or append a `key: [a, b, c]` field in the frontmatter body. If the
 * existing block uses the dash-list form, we still rewrite to inline. The
 * resolved list is inline because it's machine-only output.
 */
function upsertListField(fm: string, key: string, items: string[]): string {
	const lines = fm.split(/\r?\n/);
	const inlineRe = new RegExp(`^${key}\\s*:\\s*\\[.*?\\]\\s*$`);
	const blockHeadRe = new RegExp(`^${key}\\s*:\\s*$`);
	const inlineValue = `${key}: [${items.map((x) => JSON.stringify(x)).join(", ")}]`;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (inlineRe.test(line)) {
			lines[i] = inlineValue;
			return lines.join("\n");
		}
		if (blockHeadRe.test(line)) {
			let end = i + 1;
			while (end < lines.length && /^\s*-\s+/.test(lines[end]!)) end++;
			lines.splice(i, end - i, inlineValue);
			return lines.join("\n");
		}
	}

	if (lines[lines.length - 1] !== "") lines.push("");
	lines[lines.length - 1] = inlineValue;
	return lines.join("\n");
}
