export type PericopeEntry = {
	id: string;
	title: string;
	refs: string[];
};

const userPericopes: PericopeEntry[] = [];

export function setUserPericopes(entries: PericopeEntry[]): void {
	userPericopes.length = 0;
	for (const e of entries) {
		if (typeof e?.id === "string" && typeof e?.title === "string" && Array.isArray(e?.refs)) {
			userPericopes.push({ id: e.id, title: e.title, refs: e.refs.filter((r) => typeof r === "string") });
		}
	}
}

export function getActivePericopes(): PericopeEntry[] {
	return [...BUILTIN_PERICOPES, ...userPericopes];
}

export const BUILTIN_PERICOPES: PericopeEntry[] = [
	{
		id: "baptism",
		title: "Baptism of Jesus (synoptic parallels)",
		refs: ["Matt 3:13-17", "Mark 1:9-11", "Luke 3:21-22"],
	},
	{
		id: "parable-sower",
		title: "Parable of the sower",
		refs: ["Matt 13:1-23", "Mark 4:1-20", "Luke 8:4-15"],
	},
	{
		id: "empty-tomb",
		title: "Empty tomb",
		refs: ["Matt 28:1-10", "Mark 16:1-8", "Luke 24:1-12", "John 20:1-10"],
	},
	{
		id: "emmaus",
		title: "Road to Emmaus",
		refs: ["Luke 24:13-35"],
	},
	{
		id: "pentecost",
		title: "Pentecost",
		refs: ["Acts 2:1-47"],
	},
];
