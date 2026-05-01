# Changelog

All notable changes to Scriptorium are documented in this file.

The format is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to semantic versioning.

## Unreleased

### Changed
- **Study notes discovery** — default-on left-ribbon shortcut (toggle in
  **Settings → Scriptorium → Sidebar**); **Study notes** section with a
  “New study note…” button plus command-palette reminder.

## 0.2.0 — accuracy + UX

### Added
- **Free Bible API provider** (bible-api.com) — no key, public-domain
  translations (WEB, KJV, ASV, BBE, OEB, Darby, YLT, DRA, Clementine).
  Default text provider so verse text works the moment you install.
- **ESV API provider** — bring-your-own-key for ESV access.
- **Logos URL builder** — `logosres:` desktop links from a configurable
  resource alias and ref prefix. (Builders also for BibleGateway, Blue Letter
  Bible, STEP Bible.)
- **Persistent text cache** — passages survive Obsidian restarts; LRU-capped
  at 500 entries.
- **Hover popover on detected references** — verse preview + action buttons
  (Open, Hub, Copy OSIS, More). Works in both edit and reading mode, with
  bounds-checked positioning, mouse + focus + tap triggers, Escape dismiss.
- **Right-click context menu on references** — `Open in [app]`, alternate
  apps, hub note, copy OSIS / Markdown link, convert to wikilink, insert
  verse text. Fires from the editor menu and from reading-mode wrapped refs.
- **Selection action bar** — select text containing a parseable ref to surface
  a floating toolbar (Open / Hub / OSIS / Wikilink / Insert text / More).
  Always shows actions, even with no provider configured.
- **Status-bar item** — current provider + network state; click toggles the
  network kill-switch.
- **Section colors** — optional book-section tinting (Pentateuch / Wisdom /
  Prophets / Gospels / Pauline / etc.) on highlighted refs.
- **Ambient suggest** — `John 3:16` typed in prose surfaces a "Linkify
  reference" suggestion with no `/ref` prefix. Off by default.
- **Study-note types** — new `Scriptorium: New study note` command and
  modal: pick **Sermon**, **Inductive Bible study**, **Word study**,
  **Exegetical paper**, **Lectio Divina**, **Manuscript study**, or **Reading
  plan**; templated body + frontmatter; type-aware reading-mode chrome.
- **Sermon callouts** — `[!sermon-bigidea]`, `[!sermon-application]`,
  `[!sermon-illustration]`, `[!sermon-question]`. Pure CSS, theme-aware.
- **Slide outline export** — `Scriptorium: Export current note as slide
  outline` produces a `*.slides.md` file compatible with Advanced Slides.
- **Frontmatter passage indexing** — `Scriptorium: Index passages in this
  note's frontmatter` resolves `passages: [...]` to canonical OSIS keys in
  `passages_resolved:` for Dataview queries.
- **Sectioned settings tab** with section nav, search, per-section help,
  live "Test parser" textbox, settings export/import, reset-to-defaults.
- **Browse Bibles** button in API.Bible settings — fetches the catalog and
  lets you pick by name/abbrev/language instead of pasting GUIDs.
- **Test connection** buttons for every keyed provider.
- **Strong's inline gloss** — bundled common-word data; `G####`/`H####`
  tokens get hover tooltips with lemma, transliteration, gloss.
- **Convert-to-wikilink** command (single ref under cursor) and optional
  paste auto-linkify.
- **Passage pane Pin** — lock the pane to a single ref instead of following
  the cursor.

### Fixed / changed
- **Real per-chapter verse counts** for the entire Protestant canon +
  deuterocanon (no more `60`/`45` fallbacks). `John 3:42` is now correctly
  rejected; out-of-range starts return `null` from `parseReference`.
- **Cross-chapter ranges** parse correctly: `John 3:16-4:2`, `Romans 1-3`,
  `Genesis 1-2:3` all emit one segment per chapter.
- **Verse comma-lists** parse correctly: `John 3:16,18,20` → three
  single-verse segments.
- **Inline-ref regex** consolidated to a single source of truth
  (`src/reference/regex.ts`); broadened to match chapter-only and chapter-
  range forms with an uppercase-first-letter constraint that prevents
  prose false-positives.
- **`linkRefsInMarkdown` is idempotent** — re-running on already-linked
  notes is a no-op; refs inside wikilinks, markdown links, inline code,
  and fenced code blocks are skipped.
- **OSIS short forms parse via the fuzzy matcher** — `Gen 1:1`, `Matt 5:1`,
  `Phlm 1:5`, `Heb 1:1` all work without dot form.
- **Hub paths** split into a pure module (`src/vault/hub-paths.ts`) so tests
  don't transitively import `obsidian`.
- **Passage pane** active-leaf-change refresh debounced (150ms) and gated
  on visibility.
- **Vault-folder provider** recognizes header (`# 1`), bold (`**1**`),
  inline (`1 In the beginning…`), USFM (`\v 1`), bracket (`[1]`), and
  caret (`^1`) verse markers.

## 0.1.0 — initial scaffold

- Reference parser (Protestant + optional deuterocanon, OSIS-style refs,
  fuzzy book matching).
- CodeMirror 6 inline highlight, `EditorSuggest` on `/ref`.
- Reading-mode postprocessor with Strong's tokens and
  `[!scripture]`/`[!bible]`/`[!passage]` callouts.
- Olive Tree, biblia.com, YouVersion, Accordance handoffs; Logos paste
  normalization.
- API.Bible provider, vault folder provider, network kill-switch.
- Lectionary CSV, built-in pericopes, Greek/Hebrew character pickers.
- Hub notes with OSIS frontmatter, "link inline references" command.
