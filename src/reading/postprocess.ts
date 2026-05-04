import { Menu, Notice, TFile, type MarkdownPostProcessorContext } from "obsidian";
import { parseReference } from "../reference/parser";
import { inlineRefRegex } from "../reference/regex";
import { findStrongsTokens, formatStrongsUrl } from "../study/strongs";
import { lookupStrongs } from "../study/strongs-data";
import { attachRefPopover } from "../ui/ref-popover";
import { buildRefMenu } from "../ui/ref-menu";
import { sectionClassFor } from "../ui/section-styles";
import { isTouchPrimary } from "../util/platform";
import type ScriptoriumPlugin from "../main";

function mergeEvents(
	events: { start: number; end: number; type: "ref" | "strong"; payload: string }[]
) {
	const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
	const out: typeof events = [];
	for (const e of sorted) {
		const last = out[out.length - 1];
		if (!last || e.start >= last.end) out.push(e);
	}
	return out;
}

function enrichScriptureCallout(host: HTMLElement, plugin: ScriptoriumPlugin): void {
	if (host.querySelector(".scriptorium-callout-enriched")) return;
	const content = host.querySelector(".callout-content");
	const text = (content?.textContent ?? host.textContent ?? "").trim();
	const firstLine = text.split("\n")[0]?.trim() ?? "";
	const ref = parseReference(firstLine);
	if (!ref?.segments[0]) return;
	const box = document.createElement("div");
	box.className = "scriptorium-callout-enriched";
	const seg = ref.segments[0];
	void plugin.pickProvider().getPassage(seg).then((r) => {
		box.textContent = r?.text ?? "(Enable a text provider for preview.)";
	});
	host.appendChild(box);
}

function wrapTextNode(node: Text, plugin: ScriptoriumPlugin): void {
	const parent = node.parentElement;
	if (!parent) return;
	const text = node.textContent ?? "";
	if (!text.trim()) return;

	const frag = document.createDocumentFragment();
	let cursor = 0;
	const refRe = inlineRefRegex("g");
	const matches: { start: number; end: number; text: string }[] = [];
	let m: RegExpExecArray | null;
	while ((m = refRe.exec(text)) !== null) {
		const slice = m[1]!;
		if (parseReference(slice)) {
			matches.push({ start: m.index, end: m.index + slice.length, text: slice });
		}
	}
	const strong = findStrongsTokens(text);
	const events: { start: number; end: number; type: "ref" | "strong"; payload: string }[] = [];
	for (const x of matches) events.push({ start: x.start, end: x.end, type: "ref", payload: x.text });
	for (const s of strong) events.push({ start: s.start, end: s.end, type: "strong", payload: `${s.kind}${s.num}` });
	const outEvents = mergeEvents(events);

	for (const e of outEvents) {
		if (cursor < e.start) {
			frag.appendChild(document.createTextNode(text.slice(cursor, e.start)));
		}
		if (e.type === "ref") {
			const parsed = parseReference(e.payload);
			if (!parsed?.segments[0]) {
				cursor = e.end;
				continue;
			}
			const seg = parsed.segments[0];
			const span = document.createElement("span");
			span.className = "scriptorium-ref-preview";
			span.dataset.ref = e.payload;
			if (plugin.settings.colorBookSection) {
				span.classList.add(sectionClassFor(seg.bookOsis));
			}
			const a = document.createElement("a");
			a.textContent = e.payload;
			a.href = "#";
			a.className = "scriptorium-ref-anchor";
			a.setAttribute("aria-label", `Scripture reference ${e.payload}`);
			const activateReading = (): void => {
				plugin.noteReadingPassageRef(parsed);
			};
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				activateReading();
				if (ev.shiftKey) {
					plugin.openParsed(parsed);
					return;
				}
				if (isTouchPrimary()) return;
				const menu = new Menu();
				buildRefMenu(menu, { plugin, parsed, matchedText: e.payload });
				menu.showAtMouseEvent(ev);
			});
			a.addEventListener("contextmenu", (ev) => {
				ev.preventDefault();
				activateReading();
				const menu = new Menu();
				buildRefMenu(menu, { plugin, parsed, matchedText: e.payload });
				menu.showAtMouseEvent(ev);
			});
			span.appendChild(a);
			attachRefPopover(plugin, a, seg, parsed, e.payload, {
				onReadingActivate: activateReading,
			});
			frag.appendChild(span);
		} else {
			const kind = e.payload[0] === "G" ? "G" : "H";
			const num = e.payload.slice(1);
			const entry = lookupStrongs(kind, num);
			const a = document.createElement("a");
			a.textContent = e.payload;
			a.className = "scriptorium-strong";
			a.href = "#";
			if (entry) {
				a.title = `${entry.lemma} (${entry.translit}) — ${entry.gloss}`;
				a.setAttribute("aria-label", `${e.payload}: ${entry.lemma} ${entry.translit} — ${entry.gloss}`);
			}
			const openLexicon = (): void => {
				window.open(
					formatStrongsUrl(kind, num, plugin.settings.lexiconBaseUrlGreek, plugin.settings.lexiconBaseUrlHebrew),
					"_blank"
				);
			};
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				// On touch the `title=` tooltip never renders. Surface the
				// gloss as a Notice so the user gets the info before the
				// lexicon URL switches apps.
				if (isTouchPrimary() && entry) {
					new Notice(`${e.payload} · ${entry.lemma} (${entry.translit}) — ${entry.gloss}`, 4000);
				}
				openLexicon();
			});
			frag.appendChild(a);
		}
		cursor = e.end;
	}
	if (cursor < text.length) {
		frag.appendChild(document.createTextNode(text.slice(cursor)));
	}
	if (frag.childNodes.length === 0) return;
	const sameSingleText =
		frag.childNodes.length === 1 && frag.firstChild?.nodeType === Node.TEXT_NODE && frag.textContent === text;
	if (sameSingleText) return;
	parent.replaceChild(frag, node);
}

function walk(el: Element, plugin: ScriptoriumPlugin): void {
	if (el instanceof HTMLElement && plugin.settings.scriptureCallouts && el.classList.contains("callout")) {
		const dc = el.getAttribute("data-callout");
		if (dc === "scripture" || dc === "bible" || dc === "passage") {
			enrichScriptureCallout(el, plugin);
		}
	}
	for (const child of Array.from(el.childNodes)) {
		if (child.nodeType === Node.TEXT_NODE) {
			if (plugin.settings.readingProcessRefs) {
				wrapTextNode(child as Text, plugin);
			}
		} else if (child.nodeType === Node.ELEMENT_NODE) {
			const tag = (child as Element).tagName;
			if (tag === "CODE" || tag === "PRE" || tag === "A") continue;
			walk(child as Element, plugin);
		}
	}
}

const STUDY_TYPE_LABELS: Record<string, string> = {
	sermon: "Sermon",
	inductive: "Inductive Bible study",
	"word-study": "Word study",
	exegetical: "Exegetical paper",
	lectio: "Lectio Divina",
	manuscript: "Manuscript study",
	"reading-plan": "Reading plan",
};

function applyStudioChrome(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext,
	plugin: ScriptoriumPlugin
): void {
	// Only run on the first block of a note (post-processors are called per
	// rendered block; we use the source-path lookup to read frontmatter).
	if (el.querySelector(".scriptorium-studio-bar")) return;
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!(file instanceof TFile)) return;
	const cache = plugin.app.metadataCache.getFileCache(file);
	const fm = cache?.frontmatter;
	const type = typeof fm?.type === "string" ? fm.type : "";
	if (!STUDY_TYPE_LABELS[type]) return;

	// Only inject the bar onto the first H1 we see (so it visually replaces the title).
	const firstH1 = el.querySelector("h1");
	if (!firstH1 || firstH1.previousSibling) return;

	const bar = document.createElement("div");
	bar.className = "scriptorium-studio-bar";
	bar.dataset.studyType = type;
	bar.textContent = STUDY_TYPE_LABELS[type] ?? type;
	const date = typeof fm?.date === "string" ? fm.date : "";
	if (date) {
		const sep = document.createElement("span");
		sep.textContent = " · ";
		bar.appendChild(sep);
		const dateEl = document.createElement("span");
		dateEl.textContent = date;
		bar.appendChild(dateEl);
	}
	firstH1.parentElement?.insertBefore(bar, firstH1);
}

export function registerReadingModeProcessors(plugin: ScriptoriumPlugin): void {
	plugin.registerMarkdownPostProcessor(
		(el, ctx: MarkdownPostProcessorContext) => {
			applyStudioChrome(el, ctx, plugin);
			if (!plugin.settings.readingProcessRefs && !plugin.settings.scriptureCallouts) return;
			walk(el, plugin);
		},
		40
	);

	plugin.registerMarkdownCodeBlockProcessor("passage", (source, el) => {
		if (!plugin.settings.passageCodeBlocks) {
			el.createEl("pre", { text: source });
			return;
		}
		el.addClass("scriptorium-passage-block");
		const ref = parseReference(source.trim());
		if (!ref) {
			el.createEl("div", { text: "Invalid passage in block" });
			return;
		}
		el.createEl("div", { cls: "scriptorium-passage-title", text: ref.human });
		const pre = el.createEl("pre", { cls: "scriptorium-passage-pre" });
		const seg = ref.segments[0]!;
		void plugin.pickProvider().getPassage(seg).then((r) => {
			if (r?.text) pre.setText(r.text);
			else pre.setText("(No text provider — configure settings or add Vault Bible files.)");
		});
	});
}
