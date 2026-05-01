export type VerseSpan = { start: number; end: number };

export type PassageSegment = {
	bookOsis: string;
	chapter: number;
	verses: VerseSpan;
};

export type ParsedReference = {
	segments: PassageSegment[];
	human: string;
};

export type BookRecord = {
	osis: string;
	name: string;
	aliases: string[];
	chapters: number;
};
