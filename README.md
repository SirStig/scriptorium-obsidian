# Scriptorium (Obsidian)

Plugin covering the full “master plan” scope: canon (Protestant + optional deuterocanon), OSIS-style refs (`Jn.3.16`), fuzzy `/ref` autocomplete, CM6 highlighting with debounce, reading-mode references and Strong’s, `[!scripture]` / `[!bible]` / `[!passage]` callouts, ` ```passage` blocks, passage sidebar, lectionary CSV, pericope snippets, Greek/Hebrew insert pickers, hub wikilink conversion, YouVersion / Accordance / Olive Tree / biblia.com handoff, Logos URI paste normalization, optional API.Bible with USFM passage ids and in-memory cache, custom alias packs (JSON setting or note), network kill-switch, and interlinear folder helper.

## Develop

```bash
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/scriptorium/`.

```bash
npm test
```

## Commands (high level)

- Open passage externally, hub note, copy OSIS id, link inline refs to hub paths, refresh passage pane, insert today’s lectionary, insert built-in pericope set, Greek / Hebrew character picker, ensure interlinear folder.

## Obsidian Publish

Reading-mode DOM tweaks (ref previews, callout enrichment) run **only in the app**; **Publish does not run community plugin JavaScript**, so published sites will show **plain Markdown**, not this plugin’s interactive previews. Use hub links and standard Markdown for Publish, or export static HTML elsewhere.

## Legal / data

Logos has no public full-library API for third parties. API.Bible and bible.com require keys/terms where applicable. Do not redistribute copyrighted Bible text without permission; use vault files or licensed APIs.

## Templates

See `templates/` for sermon and inductive study starters.
