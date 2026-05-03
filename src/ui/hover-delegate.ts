import { parseReference } from "../reference/parser";
import { hoverBlockedByTextSelection, openRefPopover } from "./ref-popover";
import { isTouchPrimary } from "../util/platform";
import type ScriptoriumPlugin from "../main";

/**
 * Delegated hover handler. CM6 wraps decorated references in `<span class="...
 * scriptorium-scripture-ref ...">` elements that the framework re-creates on
 * every edit, so per-element wiring (`attachRefPopover`) doesn't survive
 * editor updates. Instead we listen once at the document level and resolve
 * the hovered span on the fly.
 */
export class RefHoverDelegate {
	private cleanups: (() => void)[] = [];
	private hoverTimer = 0;
	private currentTarget: HTMLElement | null = null;

	constructor(private plugin: ScriptoriumPlugin) {}

	attach(): void {
		// Touch primary: hover doesn't exist as an input modality, and Obsidian
		// Mobile's editor long-press already shows the editor-menu (wired in
		// main.ts) which includes ref actions. Skip the listeners entirely.
		if (isTouchPrimary()) return;

		const onOver = (e: MouseEvent): void => {
			if (!this.plugin.settings.hoverPopover) return;
			const t = e.target as Element | null;
			if (!t) return;
			const span = t.closest?.(".scriptorium-scripture-ref");
			if (!(span instanceof HTMLElement)) return;
			// Don't double-trigger on reading-mode anchors — those already have
			// their own popover wiring (attachRefPopover).
			if (span.querySelector(".scriptorium-ref-anchor")) return;
			if (this.currentTarget === span) return;
			window.clearTimeout(this.hoverTimer);
			this.currentTarget = span;
			this.hoverTimer = window.setTimeout(() => this.tryOpen(span), 200);
		};
		const onOut = (e: MouseEvent): void => {
			const t = e.target as Element | null;
			if (!t) return;
			if (t === this.currentTarget) {
				const next = e.relatedTarget as Node | null;
				if (next && this.currentTarget?.contains(next)) return;
				window.clearTimeout(this.hoverTimer);
				this.currentTarget = null;
			}
		};
		const onCtx = (): void => {
			window.clearTimeout(this.hoverTimer);
			this.currentTarget = null;
		};
		document.addEventListener("mouseover", onOver);
		document.addEventListener("mouseout", onOut);
		document.addEventListener("contextmenu", onCtx, true);
		this.cleanups.push(() => document.removeEventListener("mouseover", onOver));
		this.cleanups.push(() => document.removeEventListener("mouseout", onOut));
		this.cleanups.push(() => document.removeEventListener("contextmenu", onCtx, true));
	}

	detach(): void {
		window.clearTimeout(this.hoverTimer);
		for (const c of this.cleanups) c();
		this.cleanups = [];
	}

	private tryOpen(span: HTMLElement): void {
		const text = span.textContent ?? "";
		if (!text.trim()) return;
		if (hoverBlockedByTextSelection(span)) return;
		const parsed = parseReference(text.trim());
		if (!parsed?.segments[0]) return;
		openRefPopover(this.plugin, span, parsed, text.trim());
	}
}
