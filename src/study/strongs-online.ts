import { Notice, requestUrl } from "obsidian";
import type { App, Plugin } from "obsidian";
import { setDownloadedStrongs, type StrongsEntry } from "./strongs-data";

/**
 * Online Strong's downloader.
 *
 * Pulls the OpenScriptures Strong's dictionary (CC0, public domain) for Greek
 * and Hebrew and caches it in the plugin folder so all subsequent lookups are
 * offline. The downloaded data takes precedence over the bundled common-words
 * starter set; user-supplied vault-note entries still take priority over both.
 *
 * Sources:
 *   https://github.com/openscriptures/strongs (CC0)
 */

// OpenScriptures ships the dictionaries as JS modules (`var X = { … };`),
// not pure JSON. We fetch the raw file and strip the wrapper before parse.
// JSON files were never published — earlier 404s came from guessing `.json`.
const GREEK_URL = "https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js";
const HEBREW_URL = "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js";

const GREEK_FILE = "_strongs-greek.json";
const HEBREW_FILE = "_strongs-hebrew.json";

type RawEntry = {
	lemma?: string;
	xlit?: string;
	translit?: string;
	pronunciation?: string;
	derivation?: string;
	strongs_def?: string;
	kjv_def?: string;
};

type RawDict = Record<string, RawEntry>;

function shorten(s: string, max = 140): string {
	const t = s.replace(/\s+/g, " ").trim();
	if (t.length <= max) return t;
	const cut = t.slice(0, max - 1);
	const lastSpace = cut.lastIndexOf(" ");
	return (lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut) + "…";
}

function cleanGloss(raw: string): string {
	// OpenScriptures defs sometimes include cross-refs like "X8678" or "X1980"
	// in parentheses — strip those and the trailing semicolons.
	return shorten(
		raw
			.replace(/\([Xx]\d+\)/g, "")
			.replace(/\s*;\s*$/, "")
			.replace(/\s+/g, " ")
			.trim()
	);
}

function normalize(raw: RawDict, prefix: "G" | "H"): Record<string, StrongsEntry> {
	const out: Record<string, StrongsEntry> = {};
	for (const [key, entry] of Object.entries(raw)) {
		// Keys are like "G25" or "H1" — strip the prefix.
		const num = key.replace(/^[GH]/, "").replace(/^0+/, "") || "0";
		const lemma = entry.lemma ?? "";
		const translit = (entry.translit ?? entry.xlit ?? "").trim();
		const def = entry.kjv_def || entry.strongs_def || "";
		if (!lemma && !translit && !def) continue;
		out[num] = {
			lemma: lemma || (prefix === "G" ? "—" : "—"),
			translit,
			gloss: cleanGloss(def),
		};
	}
	return out;
}

function extractJsonFromJsModule(text: string): string {
	// OpenScriptures dicts are JS files of the shape `var X = {...};` — the
	// dictionary literal itself is valid JSON. Slice between the first `{`
	// and the last `}` so the wrapper, comments, and trailing `;` go away.
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start < 0 || end < 0 || end <= start) {
		throw new Error("Unexpected dictionary format");
	}
	return text.slice(start, end + 1);
}

async function fetchAndStore(
	app: App,
	plugin: Plugin,
	url: string,
	filename: string
): Promise<{ count: number; size: number }> {
	const res = await requestUrl({ url });
	if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
	const json = extractJsonFromJsModule(res.text);
	const dataDir = `${plugin.manifest.dir ?? ""}`;
	const path = `${dataDir}/${filename}`;
	// Persist as pure JSON so reload is one parse, no regex.
	await app.vault.adapter.write(path, json);
	const parsed = JSON.parse(json) as RawDict;
	return { count: Object.keys(parsed).length, size: json.length };
}

async function loadFromDisk(
	app: App,
	plugin: Plugin,
	filename: string
): Promise<RawDict | null> {
	const dataDir = `${plugin.manifest.dir ?? ""}`;
	const path = `${dataDir}/${filename}`;
	if (!(await app.vault.adapter.exists(path))) return null;
	try {
		const text = await app.vault.adapter.read(path);
		return JSON.parse(text) as RawDict;
	} catch {
		return null;
	}
}

export type StrongsDownloadStatus = {
	greekCount: number;
	hebrewCount: number;
};

export async function loadDownloadedStrongs(app: App, plugin: Plugin): Promise<StrongsDownloadStatus> {
	const greek = await loadFromDisk(app, plugin, GREEK_FILE);
	const hebrew = await loadFromDisk(app, plugin, HEBREW_FILE);
	const greekNorm = greek ? normalize(greek, "G") : null;
	const hebrewNorm = hebrew ? normalize(hebrew, "H") : null;
	setDownloadedStrongs({ greek: greekNorm ?? undefined, hebrew: hebrewNorm ?? undefined });
	return {
		greekCount: greekNorm ? Object.keys(greekNorm).length : 0,
		hebrewCount: hebrewNorm ? Object.keys(hebrewNorm).length : 0,
	};
}

export async function downloadStrongs(
	app: App,
	plugin: Plugin
): Promise<StrongsDownloadStatus> {
	new Notice("Downloading strong's lexicon — this can take a few seconds…");
	let greekStat = { count: 0, size: 0 };
	let hebrewStat = { count: 0, size: 0 };
	try {
		greekStat = await fetchAndStore(app, plugin, GREEK_URL, GREEK_FILE);
	} catch (e) {
		new Notice(`Greek download failed: ${e instanceof Error ? e.message : "network error"}`);
	}
	try {
		hebrewStat = await fetchAndStore(app, plugin, HEBREW_URL, HEBREW_FILE);
	} catch (e) {
		new Notice(`Hebrew download failed: ${e instanceof Error ? e.message : "network error"}`);
	}
	const status = await loadDownloadedStrongs(app, plugin);
	const totalKB = Math.round((greekStat.size + hebrewStat.size) / 1024);
	new Notice(
		`Strong's installed: ${status.greekCount} Greek + ${status.hebrewCount} Hebrew entries (${totalKB} KB).`
	);
	return status;
}

export async function clearDownloadedStrongs(app: App, plugin: Plugin): Promise<void> {
	const dataDir = `${plugin.manifest.dir ?? ""}`;
	for (const f of [GREEK_FILE, HEBREW_FILE]) {
		const p = `${dataDir}/${f}`;
		if (await app.vault.adapter.exists(p)) {
			await app.vault.adapter.remove(p);
		}
	}
	setDownloadedStrongs({});
	new Notice("Strong's downloaded data cleared.");
}
