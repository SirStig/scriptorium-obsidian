import { Menu, type MarkdownPostProcessorContext } from "obsidian";
import { parseReference } from "../reference/parser";
import { inlineRefRegex } from "../reference/regex";
import { findStrongsTokens, formatStrongsUrl } from "../study/strongs";
import { attachRefPopover } from "../ui/ref-popover";
import { buildRefMenu } from "../ui/ref-menu";
import { sectionClassFor } from "../ui/section-styles";
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
	box.style.marginTop = "0.5rem";
	box.style.fontSize = "0.92em";
	const seg = ref.segments[0]!;
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
			const seg = parsed.segments[0]!;
			const span = document.createElement("span");
			span.className = "scriptorium-ref-preview";
			span.dataset.ref = e.payload;
			if (plugin.settings.colorBookSection) {
				span.classList.add(sectionClassFor(seg.bookOsis));
			}
			const a = document.createElement("a");
			a.textContent = e.payload;
			a.href = "#";
			a.className = "internal-link scriptorium-ref-anchor";
			a.setAttribute("aria-label", `Scripture reference ${e.payload}`);
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				if (ev.shiftKey) {
					plugin.openParsed(parsed);
					return;
				}
				const menu = new Menu();
				buildRefMenu(menu, { plugin, parsed, matchedText: e.payload });
				menu.showAtMouseEvent(ev);
			});
			a.addEventListener("contextmenu", (ev) => {
				ev.preventDefault();
				const menu = new Menu();
				buildRefMenu(menu, { plugin, parsed, matchedText: e.payload });
				menu.showAtMouseEvent(ev);
			});
			span.appendChild(a);
			attachRefPopover(plugin, a, seg, parsed, e.payload);
			frag.appendChild(span);
		} else {
			const kind = e.payload[0] === "G" ? "G" : "H";
			const num = e.payload.slice(1);
			const a = document.createElement("a");
			a.textContent = e.payload;
			a.className = "scriptorium-strong";
			a.href = "#";
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				window.open(
					formatStrongsUrl(kind, num, plugin.settings.lexiconBaseUrlGreek, plugin.settings.lexiconBaseUrlHebrew),
					"_blank"
				);
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

export function registerReadingModeProcessors(plugin: ScriptoriumPlugin): void {
	plugin.registerMarkdownPostProcessor(
		(el, _ctx: MarkdownPostProcessorContext) => {
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
			else pre.setText("(No text provider — configure settings or add vault Bible files.)");
		});
	});
}
