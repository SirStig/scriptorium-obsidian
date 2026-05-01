import type { TextProvider } from "./types";
import { NoneTextProvider } from "./types";
import type { VaultFolderTextProvider } from "./vault-provider";
import type { ApiBibleTextProvider } from "./api-provider";
import type { FreeBibleProvider } from "./free-provider";

export type TextProviderMode = "none" | "vault_folder" | "free_bible" | "api_bible";

export function pickTextProvider(
	none: NoneTextProvider,
	vault: VaultFolderTextProvider | null,
	free: FreeBibleProvider | null,
	api: ApiBibleTextProvider | null,
	mode: TextProviderMode
): TextProvider {
	if (mode === "vault_folder" && vault) return vault;
	if (mode === "free_bible" && free) return free;
	if (mode === "api_bible" && api) return api;
	return none;
}
