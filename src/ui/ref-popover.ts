import { Menu, Notice } from "obsidian";
import type { ParsedReference, PassageSegment } from "../reference/types";
import { toNumericOsisString } from "../reference/osis";
import { ensureHubNote } from "../vault/hub";
import { buildRefMenu } from "./ref-menu";
import { lookupCrossRefs } from "../study/cross-refs-data";
import { parseReference, formatReferenceHuman } from "../reference/parser";
import { sectionClassFor } from "./section-styles";
import { isTouchPrimary } from "../util/platform";
import type ScriptoriumPlugin from "../main";

const SECTION_LABELS: Record<string, string> = {
	"scriptorium-section-pentateuch": "Pentateuch",
	"scriptorium-section-history": "History",
	"scriptorium-section-wisdom": "Wisdom",
	"scriptorium-section-major-prophets": "Major Prophet",
	"scriptorium-section-minor-prophets": "Minor Prophet",
	"scriptorium-section-gospels": "Gospel",
	"scriptorium-section-acts": "Acts",
	"scriptorium-section-paulines": "Pauline Epistle",
	"scriptorium-section-general": "General Epistle",
	"scriptorium-section-apocalypse": "Apocalypse",
	"scriptorium-section-deutero": "Deuterocanon",
};

function buildPopoverContent(
	plugin: ScriptoriumPlugin,
	parsed: ParsedReference,
	_matchedText: string,
	onMoreActions: (e: MouseEvent) => void,
	onOpenRef: (parsed: ParsedReference) => void,
	onClose: () => void
): HTMLElement {
	const seg = parsed.segments[0]!;
	const wrap = document.createElement("div");
	wrap.className = "scriptorium-ref-pop-wrap";

	// Header: ref label + section badge + (mobile) close button
	const head = document.createElement("div");
	head.className = "scriptorium-ref-pop-head";
	const label = document.createElement("span");
	label.className = "scriptorium-ref-pop-label";
	label.textContent = formatReferenceHuman(parsed.segments);
	head.appendChild(label);

	const sectionClass = sectionClassFor(seg.bookOsis);
	if (sectionClass && SECTION_LABELS[sectionClass]) {
		const sec = document.createElement("span");
		sec.className = `scriptorium-ref-pop-section ${sectionClass}`;
		sec.textContent = SECTION_LABELS[sectionClass]!;
		head.appendChild(sec);
	}

	// Close button — explicit dismissal target, primarily for touch where
	// hover-leaves don't exist. Always rendered (cheap), styled prominent on
	// touch via CSS @media (hover: none).
	const closeBtn = document.createElement("button");
	closeBtn.className = "scriptorium-ref-pop-close";
	closeBtn.setAttribute("aria-label", "Close preview");
	closeBtn.textContent = "×";
	closeBtn.addEventListener("click", (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		onClose();
	});
	head.appendChild(closeBtn);
	wrap.appendChild(head);

	const body = document.createElement("div");
	body.className = "scriptorium-ref-pop-body";
	body.textContent = "Loading…";
	wrap.appendChild(body);

	const attr = document.createElement("div");
	attr.className = "scriptorium-ref-pop-attr";
	attr.hide();
	wrap.appendChild(attr);

	// Cross-ref chips (when bundled or downloaded data has any)
	const verseKey = toNumericOsisString([seg]);
	const chips = lookupCrossRefs(verseKey, 4);
	if (chips.length > 0) {
		const chipRow = document.createElement("div");
		chipRow.className = "scriptorium-ref-pop-chips";
		const chipsLabel = document.createElement("span");
		chipsLabel.className = "scriptorium-ref-pop-chiplabel";
		chipsLabel.textContent = "See also";
		chipRow.appendChild(chipsLabel);
		for (const ref of chips) {
			const refParsed = parseReference(ref);
			if (!refParsed) continue;
			const chip = document.createElement("button");
			chip.className = "scriptorium-ref-pop-chip";
			chip.textContent = formatReferenceHuman(refParsed.segments);
			chip.addEventListener("click", (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				onOpenRef(refParsed);
			});
			chipRow.appendChild(chip);
		}
		wrap.appendChild(chipRow);
	}

	void plugin
		.pickProvider()
		.getPassage(seg)
		.then((r) => {
			if (r?.text) {
				body.textContent = r.text;
				if (r.attribution) {
					attr.textContent = r.attribution;
					attr.show();
				}
			} else {
				body.textContent = "(No preview text. Switch to Free Bible API in Settings, or pick a provider.)";
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
			seg,
			{ allowNetwork: plugin.settings.allowNetwork }
		).then((f) => plugin.app.workspace.openLinkText(f.path, "", true));
	});
	btn("Copy OSIS", "Copy OSIS id", () => {
		void navigator.clipboard.writeText(toNumericOsisString(parsed.segments));
		new Notice("Copied OSIS ID");
	});
	btn("⋯", "More actions", (e) => onMoreActions(e));

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

export function closeActiveRefPopover(): void {
	closeActivePopover();
}

export function hoverBlockedByTextSelection(anchor: HTMLElement): boolean {
	const sel = window.getSelection();
	if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;
	try {
		return sel.getRangeAt(0).intersectsNode(anchor);
	} catch {
		return false;
	}
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
	pop.setCssProps({ left: `${Math.round(left)}px`, top: `${Math.round(top)}px` });
}

/**
 * Open a popover for the given anchor element. Closes any other open popover.
 * Returned object has a `close` method; popover also auto-closes on outside
 * click, Escape, or when the cursor leaves both the anchor and the popover.
 */
let popSequence = 0;

export function openRefPopover(
	plugin: ScriptoriumPlugin,
	anchor: HTMLElement,
	parsed: ParsedReference,
	matchedText: string
): PopoverState {
	closeActivePopover();
	const popId = `scriptorium-ref-pop-${++popSequence}`;
	const pop = document.createElement("div");
	pop.id = popId;
	pop.className = "scriptorium-ref-pop scriptorium-ref-pop-fixed";
	pop.setAttribute("role", "tooltip");
	pop.setCssProps({ visibility: "hidden" });
	const closer = { fn: (): void => {} };
	pop.appendChild(
		buildPopoverContent(
			plugin,
			parsed,
			matchedText,
			(e) => {
				const menu = new Menu();
				buildRefMenu(menu, { plugin, parsed, matchedText });
				closer.fn();
				menu.showAtMouseEvent(e);
			},
			(refParsed) => {
				closer.fn();
				const seg2 = refParsed.segments[0];
				if (seg2) {
					plugin.openParsed(refParsed);
				}
			},
			() => closer.fn()
		)
	);
	document.body.appendChild(pop);

	const prevDescribedBy = anchor.getAttribute("aria-describedby");
	anchor.setAttribute("aria-describedby", popId);

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
		if ((t as Element).closest?.(".menu")) return;
		close();
	};
	const onKey = (e: KeyboardEvent): void => {
		if (e.key === "Escape") close();
	};
	const onScroll = (e: Event): void => {
		if (pop.contains(e.target as Node)) return;
		close();
	};

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
		if (prevDescribedBy === null) anchor.removeAttribute("aria-describedby");
		else anchor.setAttribute("aria-describedby", prevDescribedBy);
		pop.remove();
		if (activePopover?.pop === pop) activePopover = null;
	};

	closer.fn = close;

	const state: PopoverState = { pop, close };
	activePopover = state;

	requestAnimationFrame(() => {
		reposition(pop, anchor.getBoundingClientRect());
		pop.setCssProps({ visibility: "visible" });
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
	matchedText: string,
	opts?: { onReadingActivate?: (p: ParsedReference) => void }
): void {
	let openTimer = 0;
	let opened: PopoverState | null = null;

	const open = (): void => {
		if (!plugin.settings.hoverPopover) return;
		if (opened) return;
		if (hoverBlockedByTextSelection(trigger)) return;
		opened = openRefPopover(plugin, trigger, parsed, matchedText);
		// Forget when the popover closes itself.
		const origClose = opened.close;
		opened.close = () => {
			origClose();
			opened = null;
		};
	};

	if (!isTouchPrimary()) {
		trigger.addEventListener("mouseenter", () => {
			window.clearTimeout(openTimer);
			openTimer = window.setTimeout(open, 200);
		});
		trigger.addEventListener("mouseleave", () => {
			window.clearTimeout(openTimer);
		});
	}
	trigger.addEventListener("focus", open);

	// Tap-toggle on touch. Track touchstart position so a vertical scroll that
	// happens to start on the anchor doesn't fire the popover.
	let tStartX = 0;
	let tStartY = 0;
	let tMoved = false;
	trigger.addEventListener("touchstart", (e) => {
		const t = e.touches[0];
		if (!t) return;
		tStartX = t.clientX;
		tStartY = t.clientY;
		tMoved = false;
	}, { passive: true });
	trigger.addEventListener("touchmove", (e) => {
		const t = e.touches[0];
		if (!t) return;
		if (Math.abs(t.clientX - tStartX) > 8 || Math.abs(t.clientY - tStartY) > 8) {
			tMoved = true;
		}
	}, { passive: true });
	trigger.addEventListener("touchend", (e) => {
		if (tMoved) return;
		e.preventDefault();
		if (opened) opened.close();
		else {
			open();
			opts?.onReadingActivate?.(parsed);
		}
	}, { passive: false });
	// Keep `seg` referenced (some implementations may want the segment id later).
	void seg;
}
