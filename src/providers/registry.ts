import type { TextProvider } from "./types";
import { NoneTextProvider } from "./types";
import type { VaultFolderTextProvider } from "./vault-provider";
import type { ApiBibleTextProvider } from "./api-provider";

export function pickTextProvider(
	none: NoneTextProvider,
	vault: VaultFolderTextProvider | null,
	api: ApiBibleTextProvider | null,
	mode: "none" | "vault_folder" | "api_bible"
): TextProvider {
	if (mode === "vault_folder" && vault) return vault;
	if (mode === "api_bible" && api) return api;
	return none;
}
