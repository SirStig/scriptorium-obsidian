/**
 * Map an OSIS book id to a "section" CSS class.
 *
 * Sections follow the conventional groupings used in most Bible introductions:
 * Pentateuch, History, Wisdom, Major Prophets, Minor Prophets, Gospels, Acts,
 * Pauline Epistles, General Epistles, Apocalypse, Deuterocanon.
 *
 * The colors themselves live in `styles.css` so themes can override them.
 */

const PENTATEUCH = new Set(["Gen", "Exod", "Lev", "Num", "Deut"]);
const HISTORY = new Set([
	"Josh", "Judg", "Ruth", "1Sam", "2Sam", "1Kgs", "2Kgs",
	"1Chr", "2Chr", "Ezra", "Neh", "Esth",
]);
const WISDOM = new Set(["Job", "Ps", "Prov", "Eccl", "Song"]);
const MAJOR_PROPHETS = new Set(["Isa", "Jer", "Lam", "Ezek", "Dan"]);
const MINOR_PROPHETS = new Set([
	"Hos", "Joel", "Amos", "Obad", "Jonah", "Mic",
	"Nah", "Hab", "Zeph", "Hag", "Zech", "Mal",
]);
const GOSPELS = new Set(["Matt", "Mark", "Luke", "John"]);
const PAULINES = new Set([
	"Rom", "1Cor", "2Cor", "Gal", "Eph", "Phil", "Col",
	"1Thess", "2Thess", "1Tim", "2Tim", "Titus", "Phlm",
]);
const GENERAL = new Set(["Heb", "Jas", "1Pet", "2Pet", "1John", "2John", "3John", "Jude"]);
const DEUTERO = new Set(["Tob", "Jdt", "Wis", "Sir", "Bar", "1Macc", "2Macc"]);

export function sectionClassFor(bookOsis: string): string {
	if (PENTATEUCH.has(bookOsis)) return "scriptorium-section-pentateuch";
	if (HISTORY.has(bookOsis)) return "scriptorium-section-history";
	if (WISDOM.has(bookOsis)) return "scriptorium-section-wisdom";
	if (MAJOR_PROPHETS.has(bookOsis)) return "scriptorium-section-major-prophets";
	if (MINOR_PROPHETS.has(bookOsis)) return "scriptorium-section-minor-prophets";
	if (GOSPELS.has(bookOsis)) return "scriptorium-section-gospels";
	if (bookOsis === "Acts") return "scriptorium-section-acts";
	if (PAULINES.has(bookOsis)) return "scriptorium-section-paulines";
	if (GENERAL.has(bookOsis)) return "scriptorium-section-general";
	if (bookOsis === "Rev") return "scriptorium-section-apocalypse";
	if (DEUTERO.has(bookOsis)) return "scriptorium-section-deutero";
	return "scriptorium-section-unknown";
}
