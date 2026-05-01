import { Notice, requestUrl } from "obsidian";

/**
 * Verse-of-the-day fetcher backed by bible-api.com (free, public-domain).
 *
 * Fetches once a day per (translation, day) and caches the result so we
 * never burn requests on duplicate calls. Returns the human-readable
 * reference + text, or null on network failure.
 */

export type VerseOfDay = {
	reference: string;
	text: string;
	translation: string;
	day: string; // YYYY-MM-DD
};

export type VodCacheStore = {
	get(): VerseOfDay | null;
	set(v: VerseOfDay): void;
};

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export async function fetchVerseOfTheDay(
	translation: string,
	store: VodCacheStore
): Promise<VerseOfDay | null> {
	const day = todayIso();
	const cached = store.get();
	if (cached && cached.day === day && cached.translation === translation) {
		return cached;
	}
	const t = (translation || "web").toLowerCase();
	const url = `https://bible-api.com/?random=verse&translation=${encodeURIComponent(t)}`;
	try {
		const res = await requestUrl({ url });
		if (res.status !== 200) return cached ?? null;
		const data = JSON.parse(res.text) as {
			reference?: string;
			text?: string;
			translation_id?: string;
			translation_name?: string;
		};
		if (!data.reference || !data.text) return cached ?? null;
		const out: VerseOfDay = {
			reference: data.reference,
			text: data.text.trim(),
			translation: data.translation_id || t,
			day,
		};
		store.set(out);
		return out;
	} catch {
		return cached ?? null;
	}
}

export function showVerseOfDayNotice(v: VerseOfDay): void {
	const text = v.text.length > 220 ? v.text.slice(0, 217) + "…" : v.text;
	new Notice(`${v.reference} (${v.translation.toUpperCase()})\n\n${text}`, 12000);
}
