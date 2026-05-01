import { Menu, Notice } from "obsidian";
import type { ParsedReference, PassageSegment } from "../reference/types";
import { toNumericOsisString } from "../reference/osis";
import { formatReferenceHuman } from "../reference/parser";
import {
	openExternalApp,
	buildBibliaWebUrl,
	buildOliveTreeUrl,
	buildYouVersionUrl,
	buildAccordanceUrl,
} from "../handoff/urls";
import { openUrlExternally } from "../handoff/open-external";
import { hubRelPath } from "../vault/hub-paths";
import { ensureHubNote } from "../vault/hub";
import { linkRefsInMarkdown } from "../vault/link-refs";
import type ScriptoriumPlugin from "../main";

export type MenuContext = {
	plugin: ScriptoriumPlugin;
	parsed: ParsedReference;
	matchedText: string;
	editorReplace?: (text: string) => void;
};

function alternateUrls(plugin: ScriptoriumPlugin, seg: PassageSegment): { label: string; url: string }[] {
	const ho = plugin.handoffOpts();
	const out: { label: string; url: string }[] = [];
	const cur = plugin.settings.openApp;
	const candidates: { id: typeof cur; label: string; url: string | null }[] = [
		{ id: "olivetree", label: "Olive Tree", url: buildOliveTreeUrl(ho.scheme, seg) },
		{ id: "biblia_web", label: "biblia.com", url: buildBibliaWebUrl(ho.translation, seg) },
		{ id: "youversion", label: "YouVersion", url: buildYouVersionUrl(ho.youVersionId, seg) },
		{ id: "accordance", label: "Accordance", url: buildAccordanceUrl(seg) },
	];
	for (const c of candidates) {
		if (!c.url) continue;
		if (c.id === cur) continue;
		out.push({ label: c.label, url: c.url });
	}
	return out;
}

/**
 * Build a context menu for a parsed reference. Used by both the editor-menu
 * event (right-click in source / live preview) and by reading-mode wrapped-ref
 * click handlers. One source of truth for ref actions.
 */
export function buildRefMenu(menu: Menu, ctx: MenuContext): void {
	const { plugin, parsed, matchedText, editorReplace } = ctx;
	const seg = parsed.segments[0];
	if (!seg) return;
	const human = formatReferenceHuman(parsed.segments);

	menu.addItem((item) =>
		item
			.setTitle(`Open in ${appLabel(plugin.settings.openApp)}`)
			.setIcon("external-link")
			.onClick(() => plugin.openParsed(parsed))
	);

	for (const alt of alternateUrls(plugin, seg)) {
		menu.addItem((item) =>
			item
				.setTitle(`Open in ${alt.label}`)
				.setIcon("external-link")
				.onClick(() => openUrlExternally(alt.url))
		);
	}

	menu.addSeparator();

	menu.addItem((item) =>
		item
			.setTitle("Open scripture hub note")
			.setIcon("book-open")
			.onClick(async () => {
				const file = await ensureHubNote(
					plugin.app,
					plugin.settings.hubFolder,
					plugin.settings.hubPerChapter,
					seg,
					{ allowNetwork: plugin.settings.allowNetwork }
				);
				await plugin.app.workspace.openLinkText(file.path, "", true);
			})
	);

	menu.addItem((item) =>
		item
			.setTitle("Reveal hub note path")
			.setIcon("folder")
			.onClick(() => {
				const path = hubRelPath(plugin.settings.hubFolder, plugin.settings.hubPerChapter, seg);
				void navigator.clipboard.writeText(path);
				new Notice(`Copied path: ${path}`);
			})
	);

	menu.addSeparator();

	menu.addItem((item) =>
		item
			.setTitle("Copy OSIS id")
			.setIcon("copy")
			.onClick(() => {
				void navigator.clipboard.writeText(toNumericOsisString(parsed.segments));
				new Notice("Copied OSIS id");
			})
	);

	menu.addItem((item) =>
		item
			.setTitle("Copy as Markdown link")
			.setIcon("copy")
			.onClick(() => {
				const url =
					openExternalApp(plugin.settings.openApp, plugin.handoffOpts(), seg) ??
					buildBibliaWebUrl(plugin.settings.bibliaTranslation, seg);
				void navigator.clipboard.writeText(`[${human}](${url})`);
				new Notice("Copied Markdown link");
			})
	);

	if (editorReplace) {
		menu.addSeparator();
		menu.addItem((item) =>
			item
				.setTitle("Convert to hub wikilink")
				.setIcon("link")
				.onClick(() => {
					const next = linkRefsInMarkdown(matchedText, plugin.settings.hubFolder, plugin.settings.hubPerChapter);
					if (next !== matchedText) editorReplace(next);
				})
		);

		menu.addItem((item) =>
			item
				.setTitle("Insert verse text below")
				.setIcon("file-text")
				.onClick(async () => {
					const r = await plugin.pickProvider().getPassage(seg);
					if (!r?.text) {
						new Notice("No text from current provider");
						return;
					}
					const lines = r.text.split(/\r?\n/).map((l) => `> ${l}`).join("\n");
					const attribution = r.attribution ? `\n> — ${r.attribution}` : "";
					editorReplace(`${matchedText}\n${lines}${attribution}\n`);
				})
		);
	}
}

function appLabel(id: string): string {
	switch (id) {
		case "olivetree":
			return "Olive Tree";
		case "biblia_web":
			return "biblia.com";
		case "youversion":
			return "YouVersion";
		case "accordance":
			return "Accordance";
		case "logos_uri":
			return "Logos";
		case "none":
			return "browser fallback";
		default:
			return id;
	}
}

