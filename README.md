# Scriptorium

A Bible-study toolkit for Obsidian. Type a reference like `John 3:16` or `1 Cor 13:4-7` anywhere in your notes and Scriptorium will recognize it, highlight it, hover-preview it (with verse text — no setup), link it to a hub note in your vault, and (one click later) jump straight to it in Olive Tree, YouVersion, Accordance, biblia.com, BibleGateway, Blue Letter Bible, STEP Bible, Logos, or any other app you wire up.

**Verse text works the moment you install** — Scriptorium ships with a free, public-domain text provider enabled by default (no key, no account). Want ESV, NIV, NASB, LSB? Pair it with the ESV API, your API.Bible key, or your own vault folder.

## What it does

### Reference handling
- Parses every form people actually type: `John 3:16`, `Jn 3:16`, `1 Cor 13:4-7`, `John 3:16-4:2`, `Romans 1-3`, `John 3:16,18,20`, `Jn.3.16`, multi-segment with `;`. Real per-chapter verse counts for the entire Protestant canon plus deuterocanon, so out-of-range references (`John 3:42`) are correctly rejected instead of silently clamped.
- **Inline highlighting** in the editor (CodeMirror 6, debounced) with optional **book-section colors** (Pentateuch, Wisdom, Prophets, Gospels, Pauline, etc.).
- **Hover popover** on detected references with verse text + action buttons (Open / Hub / Copy OSIS / More). Works in both edit and reading mode, mouse + focus + tap, bounds-checked positioning.
- **Right-click context menu** on a reference: Open in current app, alternate apps, hub note, copy OSIS / Markdown link, convert to wikilink, insert verse text.
- **Selection action bar** — select text containing a reference and a floating toolbar appears with the same actions. Always shows actions even with no provider configured.
- **`EditorSuggest` autocomplete.** Type `/ref ` (configurable) and start typing — `1co13`, `jn 3 16`, or `Tobit 1:3` all resolve. Optional **ambient mode** surfaces a "Linkify reference" suggestion when you've just finished typing something that looks like a reference, no `/ref` prefix needed.
- Strong's tokens like `G3056` and `H1254` get bundled lemma/transliteration/gloss tooltips for the most common words, plus click-through to a lexicon URL of your choice.
- **Scripture callouts** — `> [!scripture] John 3:16` (also `[!bible]`, `[!passage]`) renders the reference with passage text inlined.
- **Passage code blocks** —
  <pre><code>```passage
  John 3:16
  ```</code></pre>
  renders the verse text inline using whichever text provider is configured.

### Bible text providers
| Mode | Setup | Translations | Network |
|---|---|---|---|
| **Free Bible API** *(default)* | nothing — works on install | WEB, KJV, ASV, BBE, OEB, Darby, YLT, DRA, Clementine | required |
| **ESV API** | free key from [api.esv.org](https://api.esv.org/) | ESV | required |
| **API.Bible** | free key from [scripture.api.bible](https://scripture.api.bible/) — built-in catalog browser to pick a Bible id | thousands | required |
| **Vault folder** | per-chapter Markdown files in a folder you control | anything you supply | offline |
| **References only** | nothing — no text | n/a | offline |

A single **Allow network** toggle (also click the status-bar item) cuts all outbound traffic. Cached passages persist across restarts (LRU-capped at 500 entries, version-stamped).

### Study-note types
**How to start:** **Settings → Scriptorium → Study notes** (button **New study note…**), the **New study note** icon in the left ribbon (on by default — turn off under **Sidebar**), or the command palette: `Scriptorium: New study note` (assign a hotkey under **Obsidian Settings → Hotkeys**).

The modal offers seven types:
**Sermon**, **Inductive Bible study**, **Word study**, **Exegetical paper**, **Lectio Divina**, **Manuscript study**, **Reading plan entry**. Each type writes a `type:` frontmatter key and a templated body; reading mode adds a colored top bar so the type is visible at a glance.

Sermon notes get pre-styled callouts: `[!sermon-bigidea]`, `[!sermon-application]`, `[!sermon-illustration]`, `[!sermon-question]`. `Scriptorium: Export current note as slide outline` writes a `*.slides.md` next to the source, compatible with [Advanced Slides](https://github.com/MSzturc/obsidian-advanced-slides).

`Scriptorium: Index passages in this note's frontmatter` resolves `passages: [...]` strings into canonical OSIS keys in `passages_resolved:` for Dataview queries:

```dataview
TABLE passages_resolved AS Refs
FROM "Studies"
WHERE contains(passages_resolved, "John.3.16")
```

### Hub notes
One command turns the reference at your cursor into (or links to) a per-book/per-chapter note under `Scripture/Hub/<Book>/ch-<n>.md`, with OSIS frontmatter so Dataview / search / graph all work.

`Scriptorium: Link inline references to hub paths` rewrites a whole note's inline references to `[[Scripture/Hub/...|original text]]` wikilinks. Safe to re-run — wikilinks, markdown links, and code spans are skipped. Optional **auto-linkify on paste** runs the same logic on pasted text.

### External app handoff
**Olive Tree** (`olivetree://`), **YouVersion** (bible.com), **Accordance** (`accord://`), **biblia.com**, **BibleGateway**, **Blue Letter Bible**, **STEP Bible**, **Logos desktop** (`logosres:` — needs a resource alias and ref prefix copied from a Logos Bible link). Pasted `logosres:`/`logos4:`/`logosft:` links are auto-rewritten to Markdown links.

### Pedagogy
Lectionary CSV (`date,ref,...`) — insert today's readings with one command. A built-in pericope set (Synoptic parallels, etc.) ships with the plugin. Greek and Hebrew character pickers. Custom book alias packs via a JSON setting *or* a vault note's frontmatter (`aliases_map:`) or a fenced ```` ```json ```` block.

Protestant canon by default; toggle on the deuterocanon (Tobit, Judith, Wisdom, Sirach, Baruch, 1–2 Maccabees) in settings.

## Install (users)

The plugin isn't in the community plugin directory yet, so install manually:

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub Release](../../releases).
2. Drop them into `<your-vault>/.obsidian/plugins/scriptorium/` (create the folder if it doesn't exist).
3. In Obsidian: **Settings → Community plugins**, turn off Restricted mode if you've never enabled community plugins, then toggle **Scriptorium** on.

## Configure

Open **Settings → Scriptorium** and at minimum decide:

- **Open passages in** — which external app should the "open under cursor" command launch? Olive Tree is the default.
- **Text provider** — `References only` (no inline text), `Vault folder` (reads passage text from a folder of files in your vault), or `API.Bible` (requires a free key from [scripture.api.bible](https://scripture.api.bible/)).
- **Allow network** — leave on for API.Bible; turn off if you want a fully offline plugin.
- **Hub folder** — where hub notes get created. `Scripture/Hub` by default.
- **Study notes** — template picker under **Study notes** in this settings tab or via the ribbon; optional hotkey via **Obsidian Settings → Hotkeys**.

Reference Markdown samples for inductive and sermon layouts also live in the repo folder `templates/`.

## Develop

```bash
npm install
npm run dev          # esbuild watch — auto-installs to your vault on every rebuild
npm run build        # type-check + production build
npm test             # run unit tests once
npx vitest           # run unit tests in watch mode
```

`npm run dev` runs an esbuild watcher and copies `main.js`, `manifest.json`, and `styles.css` into your vault's plugin folder after every successful rebuild. The vault is auto-detected from Obsidian's config (`obsidian.json`) — Flatpak, native, macOS, and Windows installs all work. If you have multiple vaults registered, the script lists them and asks you to pick one:

```bash
OBSIDIAN_VAULT="/path/to/vault" npm run dev
```

You can also point at a plugin folder directly:

```bash
OBSIDIAN_PLUGIN_DIR="/some/vault/.obsidian/plugins/scriptorium" npm run dev
```

To build without auto-deploying, use `NO_DEPLOY=1 npm run dev`.

After each rebuild Obsidian still has the *old* code in memory. Reload the plugin by toggling it off and on in **Settings → Community plugins** (or install the [Hot Reload](https://github.com/pjeby/hot-reload) plugin and the change is picked up automatically).

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

The full release loop:

```bash
npm version patch                # bumps package.json AND syncs manifest.json + versions.json
git push --follow-tags
npm run release                  # produces release/<version>/ + release/scriptorium-<version>.zip
```

Then on GitHub, create a Release whose tag name is the **bare version** (e.g. `0.2.0`, **not** `v0.2.0` — Obsidian's catalog requires this). Attach `main.js`, `manifest.json`, and `styles.css` as release assets (or the zip — but the catalog reads the three files individually).

The `version` script in `package.json` runs `scripts/version-bump.mjs` automatically when you `npm version`. It writes the new version into `manifest.json`, appends `<version>: <minAppVersion>` to `versions.json`, and stages both files for the version commit.

### Submitting to the community plugin store (first time only)

After your first GitHub release exists, fork [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases) and PR an entry into `community-plugins.json`. Once it's accepted, every subsequent GitHub release is picked up automatically — no further submissions needed.

### Beta-testing without going through the store

Users can install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin and add this repo's URL to receive prereleases.

## Caveats

**Obsidian Publish doesn't run plugin JS.** Reading-mode enrichments (ref previews, callout expansion, ```` ```passage ```` blocks) only work inside the desktop/mobile app. Anything published to the web shows plain Markdown. Use the *Link inline references to hub paths* command to convert refs to wikilinks before publishing — those resolve fine on Publish.

**Bible text licensing.** Scriptorium does not bundle any Bible text. If you use the Vault-folder provider, you're responsible for the rights to whatever you put in that folder. If you use API.Bible, follow their terms. Logos has no public full-library API for third parties — that's why this plugin handles Logos via paste normalization rather than auto-fetched links.

## License

MIT.
