import { requestUrl } from "obsidian";
import type { PassageSegment } from "../reference/types";
import { getBookByOsis } from "../reference/books";
import type { PassageTextResult, TextProvider } from "./types";

/**
 * Zero-configuration provider backed by bible-api.com.
 *
 * No API key, no account. Serves public-domain translations:
 *   - web  (World English Bible) — default
 *   - kjv  (King James Version)
 *   - asv  (American Standard Version, 1901)
 *   - bbe  (Bible in Basic English)
 *
 * https://bible-api.com — terms allow free use; attribution returned in
 * `translation_name` and we surface that in `attribution`.
 */
export class FreeBibleProvider implements TextProvider {
	id = "free_bible";

	constructor(
		private translation: string,
		private allowNetwork: boolean,
		private cache: Map<string, { text: string; attribution?: string }>
	) {}

	async getPassage(seg: PassageSegment): Promise<PassageTextResult | null> {
		if (!this.allowNetwork) return null;
		const ref = formatRef(seg);
		if (!ref) return null;
		const t = (this.translation || "web").toLowerCase().trim();
		const ck = `${t}:${ref}`;
		const hit = this.cache.get(ck);
		if (hit) {
			return { text: hit.text, attribution: hit.attribution, licenseHint: "bible-api.com (public domain)" };
		}
		const url = `https://bible-api.com/${encodeURIComponent(ref)}?translation=${encodeURIComponent(t)}`;
		try {
			const res = await requestUrl({ url });
			if (res.status !== 200) return null;
			const data = JSON.parse(res.text) as {
				text?: string;
				translation_name?: string;
				translation_id?: string;
				error?: string;
			};
			if (data.error || !data.text) return null;
			const text = data.text.trim();
			const attribution = data.translation_name ?? data.translation_id;
			this.cache.set(ck, { text, attribution });
			return { text, attribution, licenseHint: "bible-api.com (public domain)" };
		} catch {
			return null;
		}
	}

	async ping(): Promise<{ ok: boolean; message: string }> {
		if (!this.allowNetwork) return { ok: false, message: "Network disabled in settings." };
		try {
			const url = `https://bible-api.com/john%203:16?translation=${encodeURIComponent(this.translation || "web")}`;
			const res = await requestUrl({ url });
			if (res.status !== 200) return { ok: false, message: `HTTP ${res.status}` };
			const data = JSON.parse(res.text) as { text?: string; error?: string };
			if (data.error) return { ok: false, message: data.error };
			if (!data.text) return { ok: false, message: "Unexpected response shape" };
			return { ok: true, message: "Connected" };
		} catch (e) {
			return { ok: false, message: e instanceof Error ? e.message : "Network error" };
		}
	}
}

function formatRef(seg: PassageSegment): string | null {
	const b = getBookByOsis(seg.bookOsis);
	if (!b) return null;
	const book = b.name.replace(/\s+/g, "+");
	if (seg.verses.start === seg.verses.end) {
		return `${book}+${seg.chapter}:${seg.verses.start}`;
	}
	return `${book}+${seg.chapter}:${seg.verses.start}-${seg.verses.end}`;
}
