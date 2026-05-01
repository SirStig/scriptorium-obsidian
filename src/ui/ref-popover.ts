import { Menu, Notice } from "obsidian";
import type { ParsedReference, PassageSegment } from "../reference/types";
import { toNumericOsisString } from "../reference/osis";
import { ensureHubNote } from "../vault/hub";
import { buildRefMenu } from "./ref-menu";
import type ScriptoriumPlugin from "../main";

/**
 * Build the popover DOM for a parsed reference. Includes:
 *   - Passage text + attribution (loaded from the active provider)
 *   - A compact action button strip (always shown, even when no provider)
 */
function buildPopoverContent(
	plugin: ScriptoriumPlugin,
	parsed: ParsedReference,
	matchedText: string
): HTMLElement {
	const seg = parsed.segments[0]!;
	const wrap = document.createElement("div");
	wrap.className = "scriptorium-ref-pop-wrap";

	const body = document.createElement("div");
	body.className = "scriptorium-ref-pop-body";
	body.textContent = "Loading…";
	wrap.appendChild(body);

	const attr = document.createElement("div");
	attr.className = "scriptorium-ref-pop-attr";
	attr.style.display = "none";
	wrap.appendChild(attr);

	void plugin
		.pickProvider()
		.getPassage(seg)
		.then((r) => {
			if (r?.text) {
				body.textContent = r.text;
				if (r.attribution) {
					attr.textContent = r.attribution;
					attr.style.display = "";
				}
			} else {
				body.textContent = "(No preview text. Switch to Free Bible API in settings, or pick a provider.)";
			}
		})
		.catch(() => {
			body.textContent = "(Could not load preview.)";
		});

	const bar = document.createElement("div");
	bar.className = "scriptorium-ref-pop-actions";
	bar.setAttribute("role", "toolbar");
	wrap.appendChild(bar);

	const btn = (label: string, title: string, onClick: (e: MouseEvent) => void): void => {
		const b = document.createElement("button");
		b.className = "scriptorium-ref-pop-btn";
		b.title = title;
		b.setAttribute("aria-label", title);
		b.textContent = label;
		b.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			onClick(e);
		});
		bar.appendChild(b);
	};

	btn("Open", "Open in external app", () => plugin.openParsed(parsed));
	btn("Hub", "Open or create hub note", () => {
		void ensureHubNote(
			plugin.app,
			plugin.settings.hubFolder,
			plugin.settings.hubPerChapter,
			seg
		).then((f) => plugin.app.workspace.openLinkText(f.path, "", true));
	});
	btn("Copy OSIS", "Copy OSIS id", () => {
		void navigator.clipboard.writeText(toNumericOsisString(parsed.segments));
		new Notice("Copied OSIS id");
	});
	btn("⋯", "More actions", (e) => {
		const menu = new Menu();
		buildRefMenu(menu, { plugin, parsed, matchedText });
		menu.showAtMouseEvent(e);
	});

	return wrap;
}

type PopoverState = {
	pop: HTMLElement;
	close: () => void;
};

let activePopover: PopoverState | null = null;

function closeActivePopover(): void {
	if (!activePopover) return;
	activePopover.close();
	activePopover = null;
}

function reposition(pop: HTMLElement, anchor: DOMRect): void {
	const pr = pop.getBoundingClientRect();
	const margin = 6;
	let left = anchor.left;
	let top = anchor.bottom + margin;
	if (left + pr.width > window.innerWidth - margin) {
		left = Math.max(margin, window.innerWidth - pr.width - margin);
	}
	if (top + pr.height > window.innerHeight - margin) {
		top = Math.max(margin, anchor.top - pr.height - margin);
	}
	pop.style.left = `${Math.round(left)}px`;
	pop.style.top = `${Math.round(top)}px`;
}

/**
 * Open a popover for the given anchor element. Closes any other open popover.
 * Returned object has a `close` method; popover also auto-closes on outside
 * click, Escape, or when the cursor leaves both the anchor and the popover.
 */
export function openRefPopover(
	plugin: ScriptoriumPlugin,
	anchor: HTMLElement,
	parsed: ParsedReference,
	matchedText: string
): PopoverState {
	closeActivePopover();
	const pop = document.createElement("div");
	pop.className = "scriptorium-ref-pop";
	pop.setAttribute("role", "tooltip");
	pop.style.position = "fixed";
	pop.style.zIndex = "9999";
	pop.style.visibility = "hidden";
	pop.appendChild(buildPopoverContent(plugin, parsed, matchedText));
	document.body.appendChild(pop);

	let leaveTimer = 0;
	const onAnchorLeave = (e: MouseEvent): void => {
		const next = e.relatedTarget as Node | null;
		if (next && (pop.contains(next) || anchor.contains(next))) return;
		window.clearTimeout(leaveTimer);
		leaveTimer = window.setTimeout(() => close(), 120);
	};
	const onPopLeave = (e: MouseEvent): void => {
		const next = e.relatedTarget as Node | null;
		if (next && (pop.contains(next) || anchor.contains(next))) return;
		window.clearTimeout(leaveTimer);
		leaveTimer = window.setTimeout(() => close(), 120);
	};
	const onPopEnter = (): void => {
		window.clearTimeout(leaveTimer);
	};
	const onOutsideClick = (e: MouseEvent): void => {
		const t = e.target as Node;
		if (pop.contains(t) || anchor.contains(t)) return;
		close();
	};
	const onKey = (e: KeyboardEvent): void => {
		if (e.key === "Escape") close();
	};
	const onScroll = (): void => close();

	anchor.addEventListener("mouseleave", onAnchorLeave);
	pop.addEventListener("mouseleave", onPopLeave);
	pop.addEventListener("mouseenter", onPopEnter);
	document.addEventListener("click", onOutsideClick, true);
	document.addEventListener("keydown", onKey, true);
	window.addEventListener("scroll", onScroll, true);

	const close = (): void => {
		window.clearTimeout(leaveTimer);
		anchor.removeEventListener("mouseleave", onAnchorLeave);
		pop.removeEventListener("mouseleave", onPopLeave);
		pop.removeEventListener("mouseenter", onPopEnter);
		document.removeEventListener("click", onOutsideClick, true);
		document.removeEventListener("keydown", onKey, true);
		window.removeEventListener("scroll", onScroll, true);
		pop.remove();
		if (activePopover?.pop === pop) activePopover = null;
	};

	const state: PopoverState = { pop, close };
	activePopover = state;

	requestAnimationFrame(() => {
		reposition(pop, anchor.getBoundingClientRect());
		pop.style.visibility = "visible";
	});

	return state;
}

/**
 * Attach hover-to-open behavior to a specific element (used by reading-mode
 * wrapped refs at construction time).
 */
export function attachRefPopover(
	plugin: ScriptoriumPlugin,
	trigger: HTMLElement,
	seg: PassageSegment,
	parsed: ParsedReference,
	matchedText: string
): void {
	let openTimer = 0;
	let opened: PopoverState | null = null;

	const open = (): void => {
		if (!plugin.settings.hoverPopover) return;
		if (opened) return;
		opened = openRefPopover(plugin, trigger, parsed, matchedText);
		// Forget when the popover closes itself.
		const origClose = opened.close;
		opened.close = () => {
			origClose();
			opened = null;
		};
	};

	trigger.addEventListener("mouseenter", () => {
		window.clearTimeout(openTimer);
		openTimer = window.setTimeout(open, 200);
	});
	trigger.addEventListener("mouseleave", () => {
		window.clearTimeout(openTimer);
	});
	trigger.addEventListener("focus", open);
	trigger.addEventListener("touchend", (e) => {
		e.preventDefault();
		if (opened) opened.close();
		else open();
	}, { passive: false });
	// Keep `seg` referenced (some implementations may want the segment id later).
	void seg;
}
