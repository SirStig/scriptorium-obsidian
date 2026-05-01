import { requestUrl } from "obsidian";
import type { PassageSegment } from "../reference/types";
import { toApiBibleUsfmSeg } from "../reference/osis";
import type { PassageTextResult, TextProvider } from "./types";

export class ApiBibleTextProvider implements TextProvider {
	id = "api_bible";

	constructor(
		private apiKey: string,
		private translationId: string,
		private allowNetwork: boolean,
		private cache: Map<string, { text: string; attribution?: string }>
	) {}

	async getPassage(seg: PassageSegment): Promise<PassageTextResult | null> {
		if (!this.allowNetwork || !this.apiKey || !this.translationId) return null;
		const passageId = toApiBibleUsfmSeg(seg);
		const ck = `${this.translationId}:${passageId}`;
		const hit = this.cache.get(ck);
		if (hit) {
			return { text: hit.text, attribution: hit.attribution, licenseHint: "API.Bible — see provider terms" };
		}
		const url = `https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(this.translationId)}/passages/${encodeURIComponent(passageId)}?content-type=text`;
		try {
			const res = await requestUrl({
				url,
				headers: { "api-key": this.apiKey },
			});
			if (res.status !== 200) return null;
			const data = JSON.parse(res.text) as { data?: { content?: string; copyright?: string } };
			const content = data.data?.content?.trim();
			if (!content) return null;
			this.cache.set(ck, { text: content, attribution: data.data?.copyright });
			return {
				text: content,
				attribution: data.data?.copyright,
				licenseHint: "API.Bible — see provider terms",
			};
		} catch {
			return null;
		}
	}

	async listBibles(): Promise<{ id: string; name: string; abbreviation: string; language: string }[]> {
		if (!this.allowNetwork || !this.apiKey) return [];
		try {
			const res = await requestUrl({
				url: "https://api.scripture.api.bible/v1/bibles",
				headers: { "api-key": this.apiKey },
			});
			if (res.status !== 200) return [];
			const data = JSON.parse(res.text) as {
				data?: {
					id: string;
					name?: string;
					nameLocal?: string;
					abbreviation?: string;
					abbreviationLocal?: string;
					language?: { id?: string; name?: string };
				}[];
			};
			return (data.data ?? []).map((b) => ({
				id: b.id,
				name: b.nameLocal || b.name || b.id,
				abbreviation: b.abbreviationLocal || b.abbreviation || "",
				language: b.language?.name || b.language?.id || "",
			}));
		} catch {
			return [];
		}
	}

	async ping(): Promise<{ ok: boolean; message: string }> {
		if (!this.allowNetwork) return { ok: false, message: "Network disabled in settings." };
		if (!this.apiKey) return { ok: false, message: "No key set." };
		if (!this.translationId) return { ok: false, message: "No Bible id set." };
		try {
			const url = `https://api.scripture.api.bible/v1/bibles/${encodeURIComponent(this.translationId)}`;
			const res = await requestUrl({ url, headers: { "api-key": this.apiKey } });
			if (res.status === 401) return { ok: false, message: "Unauthorized — check the key." };
			if (res.status === 404) return { ok: false, message: "Bible id not found." };
			if (res.status !== 200) return { ok: false, message: `HTTP ${res.status}` };
			return { ok: true, message: "Connected" };
		} catch (e) {
			return { ok: false, message: e instanceof Error ? e.message : "Network error" };
		}
	}
}
