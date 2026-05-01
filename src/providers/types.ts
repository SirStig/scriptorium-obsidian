import type { PassageSegment } from "../reference/types";

export type PassageTextResult = {
	text: string;
	attribution?: string;
	licenseHint?: string;
};

export interface TextProvider {
	id: string;
	getPassage(seg: PassageSegment): Promise<PassageTextResult | null>;
}

export class NoneTextProvider implements TextProvider {
	id = "none";
	async getPassage(): Promise<PassageTextResult | null> {
		return null;
	}
}
