// Sync manifest.json and versions.json with the version in package.json.
//
// Run automatically by `npm version <patch|minor|major>` via the
// "version" script in package.json. After bumping you can:
//   git push --follow-tags
//   npm run release
//
// versions.json maps each plugin version to the minimum Obsidian app version
// it supports (read from manifest.json). Obsidian uses this so users on older
// app versions stay on older plugin releases.

import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

const target = pkg.version;
manifest.version = target;
versions[target] = manifest.minAppVersion;

writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");

console.log(`✓ Synced manifest.json and versions.json to ${target} (minAppVersion ${manifest.minAppVersion})`);
