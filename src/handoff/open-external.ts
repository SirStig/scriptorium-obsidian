export function openUrlExternally(url: string): void {
	const req = (window as unknown as { require?: (m: string) => { shell?: { openExternal: (u: string) => Promise<void> } } })
		.require;
	try {
		const shell = req?.("electron")?.shell;
		if (shell?.openExternal) {
			void shell.openExternal(url);
			return;
		}
	} catch {
		/* Obsidian mobile or restricted context — fall through */
	}

	// Mobile / non-electron: a synthetic anchor click hands the URL to the
	// platform's URL handler (custom schemes like logosres:, olivetree://,
	// accord:// included). window.open is unreliable here — many WebViews
	// drop custom schemes when target=_blank, and pop-up blockers may swallow
	// the call entirely.
	try {
		const a = document.createElement("a");
		a.href = url;
		a.rel = "noopener";
		a.target = "_blank";
		a.setCssProps({ display: "none" });
		document.body.appendChild(a);
		a.click();
		a.remove();
		return;
	} catch {
		/* fall through */
	}
	try {
		window.open(url, "_blank");
	} catch {
		window.location.href = url;
	}
}
