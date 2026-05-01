import { requestUrl } from "obsidian";
import type { PassageSegment } from "../reference/types";
import { getBookByOsis } from "../reference/books";
import type { PassageTextResult, TextProvider } from "./types";

type CacheLike = {
	get(key: string): { text: string; attribution?: string } | undefined;
	set(key: string, entry: { text: string; attribution?: string }): void;
};

/**
 * ESV API provider. ESV-only translation; key from
 * https://api.esv.org/. Free tier covers personal study with permissive
 * caching. Endpoint: /v3/passage/text/?q=<ref>
 *
 * Authentication is `Authorization: Token <key>`.
 */
export class EsvTextProvider implements TextProvider {
	id = "esv";

	constructor(
		private apiKey: string,
		private allowNetwork: boolean,
		private cache: CacheLike
	) {}

	async getPassage(seg: PassageSegment): Promise<PassageTextResult | null> {
		if (!this.allowNetwork || !this.apiKey) return null;
		const ref = formatRef(seg);
		if (!ref) return null;
		const ck = `esv:${ref}`;
		const hit = this.cache.get(ck);
		if (hit) {
			return { text: hit.text, attribution: hit.attribution, licenseHint: "ESV API — see Crossway terms" };
		}
		const url =
			`https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(ref)}` +
			"&include-passage-references=false" +
			"&include-verse-numbers=true" +
			"&include-footnotes=false" +
			"&include-headings=false" +
			"&include-short-copyright=true";
		try {
			const res = await requestUrl({
				url,
				headers: { Authorization: `Token ${this.apiKey}` },
			});
			if (res.status !== 200) return null;
			const data = JSON.parse(res.text) as { passages?: string[] };
			const text = data.passages?.[0]?.trim();
			if (!text) return null;
			const attribution = "ESV — Crossway";
			this.cache.set(ck, { text, attribution });
			return { text, attribution, licenseHint: "ESV API — see Crossway terms" };
		} catch {
			return null;
		}
	}

	async ping(): Promise<{ ok: boolean; message: string }> {
		if (!this.allowNetwork) return { ok: false, message: "Network disabled in settings." };
		if (!this.apiKey) return { ok: false, message: "No key set." };
		try {
			const res = await requestUrl({
				url: "https://api.esv.org/v3/passage/text/?q=John+3:16&include-short-copyright=false",
				headers: { Authorization: `Token ${this.apiKey}` },
			});
			if (res.status === 401) return { ok: false, message: "Unauthorized — check the key." };
			if (res.status !== 200) return { ok: false, message: `HTTP ${res.status}` };
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
