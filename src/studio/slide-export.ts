/**
 * Convert a sermon (or any heading-structured note) into a slide-deck Markdown
 * file. Each top-level heading (#, ##) becomes a slide; nested content stays
 * with its parent slide. Slides are separated by `---` so the output works in
 * Advanced Slides (revealjs-style) or any Markdown deck tool.
 *
 * Frontmatter is preserved at the top of the file (so deck tools that consume
 * it for theme/title can read it).
 *
 * Headings deeper than H2 stay inside the current slide as their own headings;
 * lists, quotes, and callouts are passed through unchanged.
 */

export type SlideExportOptions = {
	/** Heading level that begins a new slide. Default 2 (so H1 is title slide and H2 begins each section). */
	slideLevel?: number;
	/** Whether to drop frontmatter from the output. Default false. */
	stripFrontmatter?: boolean;
};

export function exportToSlides(body: string, opts: SlideExportOptions = {}): string {
	const slideLevel = opts.slideLevel ?? 2;
	const lines = body.split(/\r?\n/);
	const out: string[] = [];

	// Pass through frontmatter unchanged.
	let i = 0;
	if (!opts.stripFrontmatter && lines[0]?.trim() === "---") {
		out.push(lines[0]!);
		i = 1;
		while (i < lines.length && lines[i]?.trim() !== "---") {
			out.push(lines[i]!);
			i++;
		}
		if (i < lines.length) {
			out.push(lines[i]!);
			i++;
		}
		out.push("");
	} else if (opts.stripFrontmatter && lines[0]?.trim() === "---") {
		i = 1;
		while (i < lines.length && lines[i]?.trim() !== "---") i++;
		if (i < lines.length) i++;
	}

	let firstSlide = true;
	for (; i < lines.length; i++) {
		const line = lines[i]!;
		const m = line.match(/^(#{1,6})\s+(.*)$/);
		if (m) {
			const level = m[1]!.length;
			if (level <= slideLevel) {
				if (!firstSlide) {
					out.push("");
					out.push("---");
					out.push("");
				}
				firstSlide = false;
			}
		}
		out.push(line);
	}

	return out.join("\n");
}
