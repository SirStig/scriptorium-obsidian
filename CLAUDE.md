# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Despite the parent path (`python/`), this is a **TypeScript Obsidian plugin** — **Scriptorium** (`scriptorium`). It bundles `src/main.ts` to a single CommonJS `main.js` via esbuild and ships alongside `manifest.json` and `styles.css` into `.obsidian/plugins/scriptorium/`.

## Commands

```bash
npm install
npm run dev          # esbuild watch with inline sourcemaps
npm run build        # tsc --noEmit type check, then esbuild production (minified, no sourcemap)
npm test             # vitest run (one shot)
npx vitest           # vitest watch
npx vitest run tests/parser.test.ts            # single test file
npx vitest run -t "parses verse ranges"        # single test by name
```

`npm run build` runs `tsc -noEmit -skipLibCheck` first, so type errors fail the build even though esbuild itself doesn't type-check. The `obsidian` package and all `@codemirror/*` / `@lezer/*` modules are marked external in `esbuild.config.mjs` — they're provided by the host app at runtime and must not be inlined.

TypeScript is strict: `strictNullChecks` and `noUncheckedIndexedAccess` are on, so array/object index access yields `T | undefined` and must be narrowed (the codebase uses `arr[i]!` non-null assertions liberally — match that style for newly added accesses where bounds are guaranteed).

## Architecture

The plugin is structured around five concerns. `src/main.ts` is the only entry point and wires them together inside `ScriptoriumPlugin.onload()`.

### 1. Reference parsing (`src/reference/`) — the core

`parseReference(input)` in `parser.ts` is the central tolerant parser used by every other subsystem. It accepts:
- Human refs: `John 3:16`, `1 Cor 13:4-7`, `John 3:16; Rom 8:28`
- OSIS-dot form: `Jn.3.16` (handled by `tryParseOsisLike` in `osis.ts` first)
- Chapter-only: `John 3` → expands to verse 1..max via `verse-limits.ts`
- Multi-segment lists separated by `;`

`books.ts` holds a **mutable singleton** active book list. `configureCanon(includeDeuterocanon, aliasOverrides)` rebuilds it and calls `syncFuzzyBooks` so that the fuzzy prefix matcher in `fuzzy.ts` stays in sync. This is invoked from `loadSettings`, `saveSettings`, and the deuterocanon toggle. Custom aliases also flow into `setOsisCompactExtras` (in `osis.ts`) so OSIS-form keys recognise the same aliases.

Aliases come from two places that both write into `settings.customAliases`:
- Settings JSON textarea in the settings tab.
- A vault note path (`customAliasesNotePath`) — `loadAliasesFromNote` reads either YAML frontmatter `aliases_map:` (object) or a fenced ```` ```json ```` block.

### 2. Editor integration (`src/editor/`)

- `cm-decorations.ts` — CodeMirror 6 `ViewPlugin` that scans the visible viewport for refs and decorates them with `.scriptorium-scripture-ref`. Doc edits are debounced by `editorHighlightDebounceMs`. Rebuilt via `plugin.refreshEditorExtensions()` (mutates `plugin.cmExtras` in place — the array reference passed to `registerEditorExtension` stays stable; `workspace.updateOptions()` republishes changes).
- `reference-suggest.ts` — Obsidian `EditorSuggest` triggered by `settings.suggestTrigger` (default `/ref`).

### 3. Reading-mode post-processors (`src/reading/postprocess.ts`)

Registered in `registerReadingModeProcessors`. Two processors:
- A general DOM walker that wraps inline ref text and Strong's tokens in interactive spans (`.scriptorium-ref-preview`, `.scriptorium-strong`) and enriches `[!scripture]` / `[!bible]` / `[!passage]` callouts. Skips `<code>`, `<pre>`, `<a>`.
- A code-block processor for ```` ```passage ```` blocks.

**Critical:** the inline-ref regex appears in three places — `cm-decorations.ts`, `reading/postprocess.ts`, and the `scriptorium-open-cursor-ref` command in `main.ts`. If you change one, change all three.

### 4. Text providers (`src/providers/`)

`TextProvider` is the small async-`getPassage(seg)` interface. Three implementations:
- `NoneTextProvider` — always returns null.
- `VaultFolderTextProvider` — reads passages from a configured folder of vault files.
- `ApiBibleTextProvider` — hits `api.scripture.api.bible` via Obsidian's `requestUrl`, with an in-memory `Map` cache passed in by the plugin (`plugin.apiResponseCache`) so the cache survives provider rebuilds.

`pickProvider()` enforces a **network kill-switch**: if `settings.allowNetwork === false`, the API.Bible provider is replaced with the None provider even when selected. Always call `plugin.pickProvider()` rather than reaching for a specific provider.

### 5. External-app handoff (`src/handoff/`)

`urls.ts` builds URLs for Olive Tree (`olivetree://`), biblia.com web, YouVersion, Accordance (`accord://`). Logos has no auto-URL — instead `paste.ts`'s `normalizePastedText` rewrites pasted Logos URIs into Markdown links on `editor-paste`, gated by `settings.pasteNormalizeLogos`.

### Misc

- `src/ui/passage-view.ts` — right-leaf side pane (`PASSAGE_VIEW_TYPE`); refreshed on `active-leaf-change`.
- `src/vault/hub.ts` — creates per-book / per-chapter hub notes with OSIS frontmatter.
- `src/pedagogy/lectionary.ts` — minimal CSV parser (`date,ref1,ref2,...`).
- `src/study/strongs.ts`, `study/greek-insert.ts` — Strong's URL formatting and Greek/Hebrew character pickers.

## Obsidian Publish caveat

Reading-mode DOM tweaks (ref previews, callout enrichment, ```` ```passage ```` blocks) **do not run on Obsidian Publish** — community-plugin JS doesn't execute there. Anything that should appear on a published site must work as plain Markdown / wikilinks. The `scriptorium-link-refs-in-note` command rewrites inline refs to hub-note wikilinks for exactly this reason.

## Testing notes

Vitest runs from `tests/**/*.ts` (see `vitest.config.ts`). Tests that touch the reference parser must reset global canon state in `beforeEach` — see `tests/parser.test.ts`:

```ts
beforeEach(() => {
    configureCanon(false, {});
    setOsisCompactExtras({});
});
```

Otherwise prior tests' deuterocanon / alias state leaks across tests because `books.ts` and `osis.ts` hold module-level singletons.
