/**
 * Persistent LRU cache for text-provider responses.
 *
 * Backed by a `Map<string, CacheEntry>` (insertion order = recency). When the
 * cache exceeds `maxEntries`, we drop the oldest 20% in one pass. Persistence
 * goes through a caller-supplied `save` callback (typically the plugin's
 * `saveData`), debounced so we don't hammer disk on every fetch.
 *
 * Cache version is bumped any time the on-disk shape changes — older entries
 * are silently discarded on load.
 */

export const CACHE_VERSION = 1;

export type CacheEntry = {
	text: string;
	attribution?: string;
	v?: number;
};

export type SerializedCache = {
	v: number;
	entries: [string, CacheEntry][];
};

export class PersistentTextCache {
	private map = new Map<string, CacheEntry>();
	private saveTimer = 0;

	constructor(
		private save: (entries: [string, CacheEntry][]) => Promise<void>,
		private maxEntries = 500,
		private debounceMs = 1500
	) {}

	hydrate(data: unknown): void {
		this.map.clear();
		if (!data || typeof data !== "object") return;
		const obj = data as SerializedCache;
		if (obj.v !== CACHE_VERSION || !Array.isArray(obj.entries)) return;
		for (const [k, v] of obj.entries) {
			if (typeof k !== "string" || !v || typeof v.text !== "string") continue;
			this.map.set(k, { text: v.text, attribution: v.attribution });
		}
	}

	get(key: string): CacheEntry | undefined {
		const hit = this.map.get(key);
		if (!hit) return undefined;
		// Refresh recency.
		this.map.delete(key);
		this.map.set(key, hit);
		return hit;
	}

	set(key: string, entry: CacheEntry): void {
		this.map.delete(key);
		this.map.set(key, entry);
		if (this.map.size > this.maxEntries) {
			const dropCount = Math.floor(this.maxEntries * 0.2);
			const it = this.map.keys();
			for (let i = 0; i < dropCount; i++) {
				const k = it.next();
				if (k.done) break;
				this.map.delete(k.value);
			}
		}
		this.scheduleSave();
	}

	clear(): void {
		this.map.clear();
		this.scheduleSave();
	}

	size(): number {
		return this.map.size;
	}

	asMap(): Map<string, CacheEntry> {
		return this.map;
	}

	private scheduleSave(): void {
		if (typeof window === "undefined") return;
		window.clearTimeout(this.saveTimer);
		this.saveTimer = window.setTimeout(() => void this.flush(), this.debounceMs);
	}

	async flush(): Promise<void> {
		const entries = Array.from(this.map.entries());
		await this.save(entries);
	}
}
