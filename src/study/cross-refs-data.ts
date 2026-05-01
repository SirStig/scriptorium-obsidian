/**
 * Bundled cross-reference data — a curated starter set of famous passages
 * with ~3-6 well-known parallels each. Public-domain associations.
 *
 * Lookup keys are OSIS verse-precise: "John.3.16". The lookup function falls
 * back to chapter-level keys ("John.3") when no verse-specific entry exists,
 * so navigation by chapter still surfaces references.
 *
 * Users can extend or fully replace via a vault-note path setting. The full
 * Treasury of Scripture Knowledge (~340k cross-refs, public domain) is too
 * large to bundle but importable as JSON.
 */

export const CROSS_REFS: Record<string, string[]> = {
	"Gen.1.1": ["John.1.1-3", "Heb.11.3", "Ps.33.6-9", "Col.1.16-17"],
	"Gen.1.27": ["Gen.5.1-2", "Matt.19.4", "Eph.4.24", "Col.3.10"],
	"Gen.3.15": ["Rom.16.20", "Gal.4.4", "1John.3.8", "Rev.12.17"],
	"Gen.12.3": ["Acts.3.25", "Gal.3.8-9", "Gal.3.14", "Rom.4.16"],
	"Gen.15.6": ["Rom.4.3", "Rom.4.9", "Rom.4.22", "Gal.3.6", "Jas.2.23"],
	"Gen.22.18": ["Acts.3.25", "Gal.3.8", "Gal.3.16"],
	"Exod.3.14": ["John.8.58", "Rev.1.4", "Rev.1.8"],
	"Exod.20.12": ["Eph.6.2-3", "Matt.15.4", "Mark.7.10"],
	"Exod.20.13": ["Matt.5.21", "Rom.13.9", "Jas.2.11"],
	"Exod.20.14": ["Matt.5.27-28", "Rom.13.9"],
	"Lev.19.18": ["Matt.22.39", "Mark.12.31", "Rom.13.9", "Gal.5.14", "Jas.2.8"],
	"Deut.6.4": ["Mark.12.29", "1Cor.8.4-6"],
	"Deut.6.5": ["Matt.22.37", "Mark.12.30", "Luke.10.27"],

	"Ps.1.1": ["Jer.17.7-8", "Ps.119.1"],
	"Ps.22.1": ["Matt.27.46", "Mark.15.34"],
	"Ps.22.18": ["Matt.27.35", "John.19.24"],
	"Ps.23.1": ["John.10.11", "John.10.14", "Heb.13.20", "1Pet.2.25", "Rev.7.17"],
	"Ps.23.4": ["Isa.43.2", "2Cor.1.4"],
	"Ps.51.10": ["Ezek.36.26", "Eph.4.23-24"],
	"Ps.110.1": ["Matt.22.44", "Mark.12.36", "Luke.20.42-43", "Acts.2.34-35", "Heb.1.13"],
	"Ps.110.4": ["Heb.5.6", "Heb.6.20", "Heb.7.17", "Heb.7.21"],
	"Ps.118.22": ["Matt.21.42", "Acts.4.11", "1Pet.2.7"],
	"Ps.119.105": ["Prov.6.23", "2Pet.1.19"],
	"Ps.139.13-14": ["Job.10.8-12", "Jer.1.5"],

	"Prov.3.5-6": ["Ps.37.3-5", "Jer.17.7-8"],
	"Eccl.12.13": ["Deut.10.12", "Mic.6.8"],

	"Isa.6.3": ["Rev.4.8"],
	"Isa.7.14": ["Matt.1.23", "Luke.1.31"],
	"Isa.9.6": ["Luke.2.11", "John.3.16"],
	"Isa.40.3": ["Matt.3.3", "Mark.1.3", "Luke.3.4", "John.1.23"],
	"Isa.40.31": ["2Cor.4.16"],
	"Isa.53.3": ["Mark.9.12", "John.1.11"],
	"Isa.53.5": ["1Pet.2.24", "Rom.4.25"],
	"Isa.53.6": ["1Pet.2.25", "Rom.5.6"],
	"Isa.53.7": ["Acts.8.32", "1Pet.2.23"],
	"Isa.55.6": ["2Cor.6.2", "Heb.3.13"],
	"Isa.55.8-9": ["Rom.11.33-34"],
	"Isa.61.1": ["Luke.4.18-19"],

	"Jer.29.11": ["Rom.8.28"],
	"Jer.31.31-34": ["Heb.8.8-12", "Heb.10.16-17", "Luke.22.20"],

	"Ezek.36.26": ["Jer.31.33", "2Cor.5.17", "Eph.4.24"],
	"Joel.2.28-29": ["Acts.2.17-18"],

	"Mic.5.2": ["Matt.2.6", "John.7.42"],

	"Matt.5.3-12": ["Luke.6.20-23"],
	"Matt.5.17": ["Rom.3.31", "Rom.10.4"],
	"Matt.6.9-13": ["Luke.11.2-4"],
	"Matt.6.33": ["Luke.12.31", "Ps.37.4"],
	"Matt.11.28-30": ["John.7.37", "1John.5.3"],
	"Matt.16.16": ["John.6.69", "1John.4.15"],
	"Matt.16.18": ["Eph.2.20", "1Pet.2.5"],
	"Matt.22.37-39": ["Deut.6.5", "Lev.19.18", "Mark.12.30-31"],
	"Matt.28.18-20": ["Mark.16.15", "Luke.24.46-49", "Acts.1.8"],

	"Mark.10.45": ["Matt.20.28", "Luke.22.27", "1Tim.2.6"],

	"Luke.1.46-55": ["1Sam.2.1-10"],
	"Luke.2.11": ["Isa.9.6", "Matt.1.21"],
	"Luke.10.27": ["Deut.6.5", "Lev.19.18"],
	"Luke.15.3-7": ["Matt.18.12-14", "Ezek.34.11-16"],
	"Luke.24.27": ["Acts.3.24", "1Pet.1.10-12"],

	"John.1.1": ["Gen.1.1", "1John.1.1", "Rev.19.13", "Col.1.15-17"],
	"John.1.14": ["Phil.2.6-8", "Heb.2.14", "1John.4.2"],
	"John.1.29": ["Isa.53.7", "1Pet.1.19", "Rev.5.6"],
	"John.3.3": ["1Pet.1.23", "1John.3.9", "Titus.3.5"],
	"John.3.16": ["John.3.36", "Rom.5.8", "1John.4.9-10", "Eph.2.4-5"],
	"John.6.35": ["John.4.14", "John.7.37", "Rev.7.16-17"],
	"John.10.11": ["Ps.23.1", "Ezek.34.11-16", "Heb.13.20"],
	"John.10.30": ["John.14.9", "John.17.21-22", "1John.5.7"],
	"John.11.25-26": ["John.5.21", "John.6.40", "1Cor.15.21-22"],
	"John.14.6": ["Heb.10.19-20", "Eph.2.18", "1Pet.3.18"],
	"John.14.27": ["Phil.4.7", "Col.3.15"],
	"John.15.5": ["2Cor.3.5", "Phil.4.13"],
	"John.15.13": ["Rom.5.7-8", "1John.3.16"],
	"John.16.33": ["Rom.5.3-5", "1John.5.4"],
	"John.17.3": ["1John.5.20", "Phil.3.8"],

	"Acts.1.8": ["Matt.28.19", "Luke.24.48", "Isa.43.10"],
	"Acts.2.38": ["Acts.3.19", "Acts.22.16"],
	"Acts.4.12": ["Matt.1.21", "1Tim.2.5"],
	"Acts.16.31": ["Rom.10.9-10", "Eph.2.8-9"],
	"Acts.17.11": ["John.5.39", "1Thess.5.21"],

	"Rom.1.16-17": ["Hab.2.4", "Gal.3.11", "Heb.10.38"],
	"Rom.3.23": ["Rom.3.10", "Eccl.7.20", "1John.1.8"],
	"Rom.5.1": ["Eph.2.14", "Col.1.20"],
	"Rom.5.8": ["John.3.16", "1John.4.10", "1Pet.3.18"],
	"Rom.6.23": ["Rom.5.12", "Gen.2.17", "1John.5.11"],
	"Rom.8.1": ["John.3.18", "John.5.24"],
	"Rom.8.28": ["Eph.1.11", "Gen.50.20"],
	"Rom.8.31": ["Ps.118.6", "Heb.13.6"],
	"Rom.8.38-39": ["Eph.3.18-19"],
	"Rom.10.9-10": ["Acts.16.31", "1John.4.15"],
	"Rom.10.17": ["Gal.3.2", "Heb.4.2"],
	"Rom.12.1-2": ["1Pet.1.14-16", "Eph.4.22-24"],

	"1Cor.13.4-7": ["Eph.4.2", "Col.3.12-14", "1Pet.4.8"],
	"1Cor.13.13": ["1Thess.1.3", "1Thess.5.8"],
	"1Cor.15.3-4": ["Isa.53.5-12", "Ps.16.10", "Hos.6.2"],
	"1Cor.15.51-57": ["1Thess.4.14-17"],

	"2Cor.5.17": ["Gal.6.15", "Eph.2.10", "Ezek.36.26"],
	"2Cor.5.21": ["Isa.53.6", "1Pet.2.22-24"],
	"2Cor.12.9": ["Phil.4.13", "Heb.4.16"],

	"Gal.2.20": ["Rom.6.6", "Phil.1.21", "Col.3.3"],
	"Gal.3.28": ["Col.3.11", "Rom.10.12"],
	"Gal.5.22-23": ["Eph.5.9", "Col.3.12-15"],
	"Gal.6.7": ["Job.4.8", "Hos.10.12"],

	"Eph.1.4-5": ["Rom.8.29", "1Pet.1.2"],
	"Eph.2.8-9": ["Rom.3.24", "Titus.3.5", "2Tim.1.9"],
	"Eph.2.10": ["Phil.2.13", "Titus.2.14"],
	"Eph.6.10-18": ["1Thess.5.8", "Rom.13.12"],

	"Phil.2.5-11": ["John.1.1-14", "Col.1.15-20", "Heb.2.9"],
	"Phil.4.6-7": ["Matt.6.25-34", "1Pet.5.7"],
	"Phil.4.13": ["2Cor.12.9", "John.15.5"],
	"Phil.4.19": ["2Cor.9.8", "Ps.23.1"],

	"Col.1.15-17": ["John.1.1-3", "Heb.1.2-3", "Rev.3.14"],
	"Col.3.1-3": ["Rom.6.4-11", "Gal.2.20"],

	"1Thess.4.16-17": ["Matt.24.30-31", "1Cor.15.51-52"],
	"1Thess.5.16-18": ["Eph.5.20", "Phil.4.4-6"],

	"2Tim.3.16-17": ["2Pet.1.20-21", "Ps.19.7"],

	"Heb.4.12": ["Eph.6.17", "1Pet.1.23"],
	"Heb.4.15-16": ["Heb.2.18", "Heb.7.25"],
	"Heb.11.1": ["Rom.8.24-25", "2Cor.5.7"],
	"Heb.11.6": ["Rom.10.17", "Jas.1.6"],
	"Heb.12.1-2": ["1Cor.9.24-25", "Phil.3.13-14"],
	"Heb.13.8": ["Mal.3.6", "Jas.1.17"],

	"Jas.1.2-4": ["Rom.5.3-5", "1Pet.1.6-7"],
	"Jas.1.5": ["Prov.2.3-6", "1Kgs.3.9"],
	"Jas.4.7": ["1Pet.5.8-9", "Eph.6.11"],
	"Jas.5.16": ["1John.5.16"],

	"1Pet.2.9": ["Exod.19.5-6", "Rev.1.6"],
	"1Pet.5.7": ["Phil.4.6", "Ps.55.22"],

	"1John.1.9": ["Prov.28.13", "Ps.32.5"],
	"1John.4.7-8": ["John.13.34-35", "1Cor.13.1-3"],
	"1John.4.19": ["Rom.5.8", "John.3.16"],

	"Rev.3.20": ["Luke.12.36", "John.14.23"],
	"Rev.21.4": ["Isa.25.8", "Isa.65.19", "1Cor.15.54-55"],
	"Rev.22.20": ["1Cor.16.22", "1Thess.4.16"],
};

const userExtraCrossRefs: Record<string, string[]> = {};

export function setUserCrossRefs(map: Record<string, string[]>): void {
	for (const k of Object.keys(userExtraCrossRefs)) delete userExtraCrossRefs[k];
	Object.assign(userExtraCrossRefs, map);
}

/**
 * Look up cross-refs for an OSIS verse key.
 *
 * Resolution: exact verse match → chapter-level fallback (e.g. "John.3" if
 * "John.3.16" missing). Returns deduped, capped at `limit` entries.
 */
export function lookupCrossRefs(verseKey: string, limit = 8): string[] {
	const variants = expandVerseKey(verseKey);
	const seen = new Set<string>();
	const out: string[] = [];
	for (const k of variants) {
		const refs = userExtraCrossRefs[k] ?? CROSS_REFS[k];
		if (!refs) continue;
		for (const r of refs) {
			if (seen.has(r)) continue;
			seen.add(r);
			out.push(r);
			if (out.length >= limit) return out;
		}
	}
	return out;
}

/**
 * Expand a verse key like "John.3.16" into the broader keys to try:
 * exact "John.3.16", a range key matching "John.3.16-X", and the chapter
 * "John.3".
 */
function expandVerseKey(verseKey: string): string[] {
	const out: string[] = [verseKey];
	const m = verseKey.match(/^([\w]+)\.(\d+)\.(\d+)/);
	if (m) {
		const verse = parseInt(m[3]!, 10);
		// Also try keys that span multiple verses including this one.
		for (const k of Object.keys(CROSS_REFS)) {
			const km = k.match(/^([\w]+)\.(\d+)\.(\d+)-(\d+)$/);
			if (!km) continue;
			if (km[1] !== m[1] || km[2] !== m[2]) continue;
			const a = parseInt(km[3]!, 10);
			const b = parseInt(km[4]!, 10);
			if (verse >= a && verse <= b) out.push(k);
		}
		out.push(`${m[1]}.${m[2]}`);
	}
	return out;
}
