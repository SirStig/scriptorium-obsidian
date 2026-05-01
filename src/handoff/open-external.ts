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
		/* Obsidian mobile or restricted context */
	}
	window.open(url, "_blank");
}
