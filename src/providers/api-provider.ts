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
}
