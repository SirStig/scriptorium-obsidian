import { describe, expect, it } from "vitest";
import { parseLectionaryCsv, rowForDate } from "../src/pedagogy/lectionary";

describe("lectionary", () => {
	it("parses csv rows", () => {
		const csv = `date,ot,nt\n2026-01-04,Gen 1:1,John 1:1`;
		const rows = parseLectionaryCsv(csv);
		expect(rows.length).toBe(1);
		expect(rows[0]!.date).toBe("2026-01-04");
		expect(rows[0]!.refs).toEqual(["Gen 1:1", "John 1:1"]);
	});

	it("finds row by date", () => {
		const rows = parseLectionaryCsv("date,a\n2026-05-01,Luke 24");
		expect(rowForDate(rows, "2026-05-01")?.refs[0]).toBe("Luke 24");
	});
});
