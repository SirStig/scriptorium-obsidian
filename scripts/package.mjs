// Stage release artifacts under release/<version>/ and (if `zip` is on PATH)
// produce release/<id>-<version>.zip for upload to a GitHub Release.
//
// Obsidian's release process:
//   1. Bump the version: `npm version patch` (also runs scripts/version-bump.mjs).
//   2. Push tags:        `git push --follow-tags`.
//   3. Build + package:  `npm run release`.
//   4. Create a GitHub Release whose **tag name matches the version exactly**
//      (no leading "v"). Upload main.js, manifest.json, styles.css as assets.
//   5. (Submission only — first release) PR `community-plugins.json` in
//      obsidianmd/obsidian-releases. After acceptance Obsidian's catalog
//      auto-pulls every subsequent GitHub release.

import { existsSync, mkdirSync, copyFileSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];

const manifest = JSON.parse(readFileSync(join(ROOT, "manifest.json"), "utf8"));
const { id, version } = manifest;
if (!id || !version) {
	console.error("manifest.json must include 'id' and 'version'.");
	process.exit(1);
}

for (const a of ARTIFACTS) {
	if (!existsSync(join(ROOT, a))) {
		console.error(`Missing ${a}. Run \`npm run build\` before packaging.`);
		process.exit(1);
	}
}

const outDir = join(ROOT, "release", version);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const a of ARTIFACTS) copyFileSync(join(ROOT, a), join(outDir, a));
console.log(`✓ Staged ${ARTIFACTS.join(", ")} → ${outDir}`);

const zipName = `${id}-${version}.zip`;
const zipPath = join(ROOT, "release", zipName);
const zip = spawnSync("zip", ["-j", zipPath, ...ARTIFACTS.map((a) => join(outDir, a))], {
	cwd: ROOT,
	stdio: "inherit",
});
if (zip.status === 0) {
	console.log(`✓ Wrote ${zipPath}`);
} else if (zip.error?.code === "ENOENT") {
	console.log("(skipped zip: 'zip' command not on PATH — upload the files in release/<version>/ individually)");
} else {
	console.error("zip failed");
	process.exit(zip.status ?? 1);
}

console.log("");
console.log(`Next: create a GitHub Release with tag '${version}' (no leading 'v')`);
console.log(`      and attach the three files (or the zip) as release assets.`);
