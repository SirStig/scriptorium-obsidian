# Scriptorium

A Bible-study plugin for Obsidian. Write a reference like `John 3:16` or `1 Cor 13:4-7` anywhere in your notes — Scriptorium recognizes it, highlights it, shows verse text on hover, links it to a hub note in your vault, and opens it in Olive Tree, YouVersion, Accordance, biblia.com, BibleGateway, Blue Letter Bible, STEP Bible, or Logos in one click.

Verse text is available immediately after install — a free, public-domain provider is enabled by default, no key or account needed. For ESV, NIV, NASB, or other translations, configure the ESV API, API.Bible, or a vault folder.

## What it does

### Reference recognition
- Parses every common form: `John 3:16`, `Jn 3:16`, `1 Cor 13:4-7`, `John 3:16-4:2`, `Romans 1-3`, `John 3:16,18,20`, `Jn.3.16`, semicolon-separated lists. Verse counts are exact per chapter, so out-of-range references are rejected rather than silently accepted.
- **Inline highlighting** in the editor with optional color-coding by canonical section (Pentateuch, Wisdom, Prophets, Gospels, Pauline, etc.).
- **Hover popover** with verse text and action buttons (Open / Hub / Copy OSIS). Works in edit and reading mode.
- **Right-click context menu** on any reference: open in an external app, create a hub note, copy as OSIS or Markdown link, insert verse text.
- **Selection action bar** — select any text containing a reference and a floating toolbar appears with the same actions.
- **Autocomplete** — type `/ref ` (configurable) then a partial reference like `1co13` or `jn 3 16`. Optional ambient mode suggests linkifying a reference as you finish typing it, without the prefix.
- Strong's tokens (`G3056`, `H1254`) show lemma, transliteration, and gloss tooltips for common words, with click-through to a lexicon of your choice.
- `> [!scripture] John 3:16` callouts (also `[!bible]`, `[!passage]`) and ` ```passage ``` ` code blocks both render inline verse text from the configured provider.

### Bible text providers
| Mode | Setup | Translations | Network |
|---|---|---|---|
| **Free Bible API** *(default)* | nothing — works on install | WEB, KJV, ASV, BBE, OEB, Darby, YLT, DRA, Clementine | required |
| **ESV API** | free key from [api.esv.org](https://api.esv.org/) | ESV | required |
| **API.Bible** | free key from [scripture.api.bible](https://scripture.api.bible/) — built-in catalog browser to pick a Bible id | thousands | required |
| **Vault folder** | per-chapter Markdown files in a folder you control | anything you supply | offline |
| **References only** | nothing — no text | n/a | offline |

A single **Allow network** toggle (also accessible from the status bar) blocks all outbound traffic. Cached passages persist across restarts (LRU-capped at 500 entries, version-stamped).

### Study notes
Open **Settings → Scriptorium → Study notes**, click the ribbon icon, or run `Scriptorium: New study note` from the command palette.

Seven templates: **Sermon**, **Inductive Bible study**, **Word study**, **Exegetical paper**, **Lectio Divina**, **Manuscript study**, **Reading plan entry**. Each writes a `type:` frontmatter key and a templated body; reading mode shows a colored top bar by note type.

Sermon notes include styled callouts (`[!sermon-bigidea]`, `[!sermon-application]`, `[!sermon-illustration]`, `[!sermon-question]`) and an export command that writes a `*.slides.md` compatible with [Advanced Slides](https://github.com/MSzturc/obsidian-advanced-slides).

`Scriptorium: Index passages in this note's frontmatter` resolves `passages: [...]` strings into canonical OSIS keys in `passages_resolved:` for Dataview queries:

```dataview
TABLE passages_resolved AS Refs
FROM "Studies"
WHERE contains(passages_resolved, "John.3.16")
```

### Hub notes
One command creates or links to a per-book/per-chapter note at `Scripture/Hub/<Book>/ch-<n>.md`, with OSIS frontmatter for Dataview, search, and graph.

`Scriptorium: Link inline references to hub paths` rewrites all inline references in a note to `[[Scripture/Hub/...|original text]]` wikilinks — safe to re-run; existing wikilinks and code spans are skipped. Optional **auto-linkify on paste** applies the same rewrite to pasted text.

### External apps
Olive Tree (`olivetree://`), YouVersion (bible.com), Accordance (`accord://`), biblia.com, BibleGateway, Blue Letter Bible, STEP Bible, and Logos desktop (`logosres:` — needs a resource alias and ref prefix from a Logos Bible link). Pasted `logosres:` / `logos4:` / `logosft:` links are rewritten to Markdown links automatically.

### Lectionary and tools
Lectionary CSV (`date,ref,...`) — insert today's readings with one command. A built-in pericope set (Synoptic parallels, etc.) ships with the plugin. Greek and Hebrew character pickers. Custom book alias packs via a JSON setting or a vault note's frontmatter (`aliases_map:`) or a fenced ` ```json ` block.

Protestant canon by default; deuterocanon toggle (Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees) available in settings.

## Install

The plugin isn't in the community plugin directory yet, so install manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub Release](../../releases).
2. Drop them into `<your-vault>/.obsidian/plugins/scriptorium/` (create the folder if it doesn't exist).
3. In Obsidian: **Settings → Community plugins**, turn off Restricted mode if you've never enabled community plugins, then toggle **Scriptorium** on.

## Configure

Open **Settings → Scriptorium** and at minimum decide:

- **Open passages in** — which external app the "open under cursor" command launches. Olive Tree is the default.
- **Text provider** — `References only` (no inline text), `Vault folder`, or `API.Bible` (requires a free key from [scripture.api.bible](https://scripture.api.bible/)).
- **Allow network** — leave on for API.Bible; turn off for a fully offline setup.
- **Hub folder** — where hub notes are created. `Scripture/Hub` by default.
- **Study notes** — template picker in the settings tab or via the ribbon; assign a hotkey under **Obsidian Settings → Hotkeys**.

Reference Markdown samples for inductive and sermon layouts live in `templates/` in the repo.

## Develop

```bash
npm install
npm run dev          # esbuild watch — auto-installs to your vault on every rebuild
npm run build        # type-check + production build
npm test             # run unit tests once
npx vitest           # run unit tests in watch mode
```

`npm run dev` runs an esbuild watcher and copies `main.js`, `manifest.json`, and `styles.css` into your vault's plugin folder after every successful rebuild. The vault is auto-detected from Obsidian's config — Flatpak, native, macOS, and Windows installs all work. If you have multiple vaults registered, the script lists them and asks you to pick one:

```bash
OBSIDIAN_VAULT="/path/to/vault" npm run dev
```

Or point at the plugin folder directly:

```bash
OBSIDIAN_PLUGIN_DIR="/some/vault/.obsidian/plugins/scriptorium" npm run dev
```

To build without deploying: `NO_DEPLOY=1 npm run dev`.

After each rebuild, reload the plugin by toggling it off and on in **Settings → Community plugins** (or use [Hot Reload](https://github.com/pjeby/hot-reload) for automatic pickup).

### One-off install to vault

```bash
npm run deploy       # production build, then copy artifacts into the vault
```

### Tests

```bash
npm test                                      # all tests, one shot
npx vitest                                    # watch mode
npx vitest run tests/parser.test.ts           # single file
npx vitest run -t "parses verse ranges"       # by name
```

## Publish a release

```bash
npm version patch                # bumps package.json AND syncs manifest.json + versions.json
git push --follow-tags
npm run release                  # produces release/<version>/ + release/scriptorium-<version>.zip
```

On GitHub, create a release whose tag matches the **bare version number** (e.g. `0.2.0`, not `v0.2.0` — Obsidian's catalog requires this). Attach `main.js`, `manifest.json`, and `styles.css` as release assets.

The `version` script in `package.json` runs `scripts/version-bump.mjs` automatically on `npm version`. It updates `manifest.json`, appends to `versions.json`, and stages both for the commit.

### Submitting to the community plugin directory (first time only)

After your first GitHub release, fork [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) and PR an entry into `community-plugins.json`. Subsequent releases are picked up automatically.

### Beta-testing without the store

Users can install [BRAT](https://github.com/TfTHacker/obsidian42-brat) and add this repo's URL to receive prereleases.

## Caveats

**Obsidian Publish doesn't run plugin JS.** Reading-mode enrichments (ref previews, callout expansion, ` ```passage ``` ` blocks) only work inside the desktop or mobile app. Anything published to the web shows plain Markdown. Use the *Link inline references to hub paths* command to convert refs to wikilinks before publishing.

**Bible text licensing.** Scriptorium does not bundle any Bible text. If you use the Vault-folder provider, you're responsible for the rights to whatever you put in that folder. If you use API.Bible, follow their terms. Logos has no public full-library API for third parties — that's why this plugin handles Logos via paste normalization rather than auto-fetched links.

**External URL / app handoffs.** On desktop, Scriptorium uses Electron's `shell.openExternal` to dispatch URLs and custom schemes. On iOS and Android it falls back to a WebView-safe anchor click instead, so custom schemes (`olivetree://`, `logosres:`, `accord://`) reach their target app when that app is installed on the device.

## License

MIT.
