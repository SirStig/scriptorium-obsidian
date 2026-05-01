import { Platform } from "obsidian";

export function isMobileApp(): boolean {
	return Platform.isMobileApp;
}

export function isPhone(): boolean {
	return Platform.isPhone;
}

export function isDesktopApp(): boolean {
	return Platform.isDesktopApp;
}

/**
 * True when touch is the primary input modality (Obsidian iOS / Android app,
 * including iPad). Used to branch UI between hover-driven (desktop) and
 * tap-driven (mobile) interaction.
 */
export function isTouchPrimary(): boolean {
	return Platform.isMobile;
}

/**
 * Custom URI scheme handlers (logosres:, accord://, olivetree://) only fire
 * when the matching app is installed. On mobile this is per-platform: Logos
 * mobile registers logosres:; Accordance is Mac/iOS; Olive Tree is iOS/Android
 * desktop wrapper. We don't gate per-app — we just label desktop-strong apps
 * in settings so users know what to expect.
 */
export function customSchemesLikelyWork(): boolean {
	return true;
}
