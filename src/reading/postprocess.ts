import type { MarkdownPostProcessorContext } from "obsidian";
import { parseReference } from "../reference/parser";
import { formatStrongsUrl, findStrongsTokens } from "../study/strongs";
import {
	openExternalApp,
	buildOliveTreeUrl,
	buildBibliaWebUrl,
} from "../handoff/urls";
import type { HandoffOpts } from "../handoff/types";
import type ScriptoriumPlugin from "../main";

function handoff(plugin: ScriptoriumPlugin): HandoffOpts {
	return {
		scheme: plugin.settings.olivetreeScheme,
		translation: plugin.settings.bibliaTranslation,
		youVersionId: plugin.settings.youVersionBibleId,
	};
}

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
	const refRe =
		/\b((?:[1-3]\s+)?[A-Za-z][A-Za-z'.]*(?:\s+[A-Za-z][A-Za-z'.]*){0,3}\s+\d+\s*:\s*\d+(?:\s*[-–—]\s*\d+)?)\b/g;
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
	for (const x of matches) {
		events.push({ start: x.start, end: x.end, type: "ref", payload: x.text });
	}
	for (const s of strong) {
		events.push({
			start: s.start,
			end: s.end,
			type: "strong",
			payload: `${s.kind}${s.num}`,
		});
	}
	const outEvents = mergeEvents(events);

	for (const e of outEvents) {
		if (cursor < e.start) {
			frag.appendChild(document.createTextNode(text.slice(cursor, e.start)));
		}
		if (e.type === "ref") {
			const parsed = parseReference(e.payload);
			if (!parsed) {
				cursor = e.end;
				continue;
			}
			const seg = parsed.segments[0]!;
			const span = document.createElement("span");
			span.className = "scriptorium-ref-preview";
			span.dataset.ref = e.payload;
			const a = document.createElement("a");
			a.textContent = e.payload;
			a.href = "#";
			a.className = "internal-link";
			a.addEventListener("click", (ev) => {
				ev.preventDefault();
				const url =
					openExternalApp(plugin.settings.openApp, handoff(plugin), seg) ??
					buildBibliaWebUrl(plugin.settings.bibliaTranslation, seg);
				window.open(url, "_blank");
			});
			const pop = document.createElement("div");
			pop.className = "scriptorium-ref-pop";
			pop.style.display = "none";
			span.appendChild(a);
			span.appendChild(pop);
			void plugin.pickProvider().getPassage(seg).then((r) => {
				if (r?.text) pop.textContent = r.text.slice(0, 500);
				else {
					const u =
						plugin.settings.openApp === "olivetree"
							? buildOliveTreeUrl(plugin.settings.olivetreeScheme, seg)
							: buildBibliaWebUrl(plugin.settings.bibliaTranslation, seg);
					pop.textContent = `Open: ${u}`;
				}
			});
			span.addEventListener("mouseenter", () => {
				pop.style.display = "block";
			});
			span.addEventListener("mouseleave", () => {
				pop.style.display = "none";
			});
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
