// Copy build artifacts (main.js, manifest.json, styles.css) into an Obsidian vault.
//
// Resolution order for the destination:
//   1. $OBSIDIAN_PLUGIN_DIR — full path to the plugin folder (used as-is).
//   2. $OBSIDIAN_VAULT      — vault root; we append `.obsidian/plugins/<id>`.
//   3. Auto-detect: read Obsidian's `obsidian.json` (Flatpak / native / macOS / Windows).
//      If exactly one vault is registered, use it. Otherwise list them and exit.
//
// Override either env var per command:
//   OBSIDIAN_VAULT=/path/to/vault npm run deploy

import { existsSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ARTIFACTS = ["main.js", "manifest.json", "styles.css"];

function readManifestId() {
	const m = JSON.parse(readReq(join(ROOT, "manifest.json")));
	if (!m.id) throw new Error("manifest.json has no 'id' field");
	return m.id;
}

function readReq(p) {
	if (!existsSync(p)) throw new Error(`Missing file: ${p}`);
	return readFileSync(p, "utf8");
}

function obsidianConfigCandidates() {
	const home = homedir();
	const plat = platform();
	const out = [];
	if (plat === "linux") {
		out.push(join(home, ".var/app/md.obsidian.Obsidian/config/obsidian/obsidian.json"));
		out.push(join(home, ".config/obsidian/obsidian.json"));
		out.push(join(home, "snap/obsidian/current/.config/obsidian/obsidian.json"));
	} else if (plat === "darwin") {
		out.push(join(home, "Library/Application Support/obsidian/obsidian.json"));
	} else if (plat === "win32") {
		const appdata = process.env.APPDATA;
		if (appdata) out.push(join(appdata, "obsidian/obsidian.json"));
	}
	return out;
}

function detectVault() {
	for (const path of obsidianConfigCandidates()) {
		if (!existsSync(path)) continue;
		try {
			const cfg = JSON.parse(readFileSync(path, "utf8"));
			const vaults = Object.values(cfg.vaults ?? {})
				.map((v) => v?.path)
				.filter((p) => typeof p === "string" && existsSync(p));
			if (vaults.length === 1) return { vault: vaults[0], source: path };
			if (vaults.length > 1) {
				return { multiple: vaults, source: path };
			}
		} catch {
			// ignore unreadable / malformed config and try next candidate
		}
	}
	return null;
}

function resolveDestination(pluginId) {
	const direct = process.env.OBSIDIAN_PLUGIN_DIR;
	if (direct) return { dest: resolve(direct), reason: "OBSIDIAN_PLUGIN_DIR env var" };

	const vaultEnv = process.env.OBSIDIAN_VAULT;
	if (vaultEnv) {
		return {
			dest: resolve(vaultEnv, ".obsidian/plugins", pluginId),
			reason: "OBSIDIAN_VAULT env var",
		};
	}

	const detected = detectVault();
	if (detected?.multiple) {
		console.error("Multiple Obsidian vaults found in", detected.source);
		console.error("Pick one by setting OBSIDIAN_VAULT, e.g.");
		for (const v of detected.multiple) console.error(`  OBSIDIAN_VAULT="${v}" npm run deploy`);
		process.exit(2);
	}
	if (detected?.vault) {
		return {
			dest: resolve(detected.vault, ".obsidian/plugins", pluginId),
			reason: `auto-detected from ${detected.source}`,
		};
	}

	console.error("Could not find an Obsidian vault.");
	console.error("Set OBSIDIAN_VAULT (path to vault root) or OBSIDIAN_PLUGIN_DIR (path to plugin folder).");
	process.exit(2);
}

function main() {
	const id = readManifestId();
	const { dest, reason } = resolveDestination(id);

	for (const a of ARTIFACTS) {
		if (!existsSync(join(ROOT, a))) {
			console.error(`Missing build artifact: ${a}. Run \`npm run build\` first.`);
			process.exit(1);
		}
	}

	mkdirSync(dest, { recursive: true });
	for (const a of ARTIFACTS) copyFileSync(join(ROOT, a), join(dest, a));

	console.log(`✓ Installed ${id} → ${dest}`);
	console.log(`  (${reason})`);
	console.log("  In Obsidian: Settings → Community plugins → toggle the plugin off and on to reload.");
}

main();
