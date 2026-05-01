/**
 * A small bundled subset of Strong's headword data for the most frequent
 * Biblical words. Public-domain (KJV-derived). The full dictionary is large
 * (~17,000 entries) and would inflate the plugin bundle, so we ship the
 * common ones here and let users point at a vault note for extras.
 *
 * Format: number → { lemma, translit, gloss }
 *   - lemma:    the Greek/Hebrew word in original script (when known)
 *   - translit: a romanization
 *   - gloss:    a one-line English summary
 */

export type StrongsEntry = {
	lemma: string;
	translit: string;
	gloss: string;
};

export const GREEK: Record<string, StrongsEntry> = {
	"25":   { lemma: "ἀγαπάω", translit: "agapaō",   gloss: "to love (with the highest, decisive love)" },
	"26":   { lemma: "ἀγάπη", translit: "agapē",    gloss: "love; covenant love" },
	"40":   { lemma: "ἅγιος", translit: "hagios",   gloss: "holy, set apart" },
	"165":  { lemma: "αἰών", translit: "aiōn",     gloss: "age, eternity" },
	"166":  { lemma: "αἰώνιος", translit: "aiōnios",  gloss: "eternal, age-lasting" },
	"281":  { lemma: "ἀμήν", translit: "amēn",     gloss: "truly, amen" },
	"302":  { lemma: "ἄν", translit: "an",        gloss: "would, might (conditional particle)" },
	"435":  { lemma: "ἀνήρ", translit: "anēr",     gloss: "man, husband" },
	"444":  { lemma: "ἄνθρωπος", translit: "anthrōpos", gloss: "human being, person" },
	"652":  { lemma: "ἀπόστολος", translit: "apostolos", gloss: "apostle, sent one" },
	"846":  { lemma: "αὐτός", translit: "autos",    gloss: "he, she, it; same; self" },
	"932":  { lemma: "βασιλεία", translit: "basileia", gloss: "kingdom, reign" },
	"965":  { lemma: "βίβλος", translit: "biblos",   gloss: "book, scroll" },
	"1093": { lemma: "γῆ", translit: "gē",        gloss: "earth, land" },
	"1097": { lemma: "γινώσκω", translit: "ginōskō", gloss: "to know, learn" },
	"1100": { lemma: "γλῶσσα", translit: "glōssa",   gloss: "tongue, language" },
	"1135": { lemma: "γυνή", translit: "gunē",     gloss: "woman, wife" },
	"1161": { lemma: "δέ", translit: "de",        gloss: "but, and (mild contrast)" },
	"1223": { lemma: "διά", translit: "dia",       gloss: "through, by means of" },
	"1242": { lemma: "διαθήκη", translit: "diathēkē", gloss: "covenant" },
	"1325": { lemma: "δίδωμι", translit: "didōmi",  gloss: "to give" },
	"1342": { lemma: "δίκαιος", translit: "dikaios", gloss: "righteous, just" },
	"1343": { lemma: "δικαιοσύνη", translit: "dikaiosunē", gloss: "righteousness, justice" },
	"1391": { lemma: "δόξα", translit: "doxa",     gloss: "glory, honor" },
	"1492": { lemma: "οἶδα", translit: "oida",     gloss: "to know (perceptive)" },
	"1519": { lemma: "εἰς", translit: "eis",       gloss: "into, toward" },
	"1722": { lemma: "ἐν", translit: "en",        gloss: "in, among" },
	"1909": { lemma: "ἐπί", translit: "epi",       gloss: "upon, on, at" },
	"2076": { lemma: "ἐστί", translit: "esti",     gloss: "is (3rd sg of εἰμί)" },
	"2098": { lemma: "εὐαγγέλιον", translit: "euangelion", gloss: "good news, gospel" },
	"2192": { lemma: "ἔχω", translit: "echō",     gloss: "to have, hold" },
	"2222": { lemma: "ζωή", translit: "zōē",      gloss: "life" },
	"2316": { lemma: "θεός", translit: "theos",    gloss: "God, god" },
	"2424": { lemma: "Ἰησοῦς", translit: "Iēsous", gloss: "Jesus, Joshua" },
	"2532": { lemma: "καί", translit: "kai",      gloss: "and, also, even" },
	"2570": { lemma: "καλός", translit: "kalos",   gloss: "good, beautiful" },
	"2588": { lemma: "καρδία", translit: "kardia",  gloss: "heart" },
	"2596": { lemma: "κατά", translit: "kata",     gloss: "down, against, according to" },
	"2962": { lemma: "κύριος", translit: "kurios",  gloss: "Lord, master" },
	"3056": { lemma: "λόγος", translit: "logos",   gloss: "word, message, reason" },
	"3306": { lemma: "μένω", translit: "menō",    gloss: "to remain, abide" },
	"3326": { lemma: "μετά", translit: "meta",     gloss: "with; after" },
	"3361": { lemma: "μή", translit: "mē",       gloss: "not (subjective negation)" },
	"3588": { lemma: "ὁ", translit: "ho",        gloss: "the (definite article)" },
	"3756": { lemma: "οὐ", translit: "ou",       gloss: "not (objective negation)" },
	"3962": { lemma: "πατήρ", translit: "patēr",   gloss: "father" },
	"3972": { lemma: "Παῦλος", translit: "Paulos", gloss: "Paul" },
	"3982": { lemma: "πείθω", translit: "peithō",  gloss: "to persuade, trust" },
	"3956": { lemma: "πᾶς", translit: "pas",      gloss: "all, every" },
	"4012": { lemma: "περί", translit: "peri",     gloss: "about, concerning" },
	"4100": { lemma: "πιστεύω", translit: "pisteuō", gloss: "to believe, trust" },
	"4102": { lemma: "πίστις", translit: "pistis",  gloss: "faith, faithfulness" },
	"4151": { lemma: "πνεῦμα", translit: "pneuma",  gloss: "spirit, wind, breath" },
	"4160": { lemma: "ποιέω", translit: "poieō",   gloss: "to do, make" },
	"4314": { lemma: "πρός", translit: "pros",     gloss: "to, toward, with" },
	"4982": { lemma: "σῴζω", translit: "sōzō",    gloss: "to save, deliver" },
	"5043": { lemma: "τέκνον", translit: "teknon",  gloss: "child" },
	"5101": { lemma: "τίς", translit: "tis",      gloss: "who? what? which?" },
	"5547": { lemma: "Χριστός", translit: "Christos", gloss: "Christ, Anointed" },
	"5590": { lemma: "ψυχή", translit: "psuchē",  gloss: "soul, life" },
	"5613": { lemma: "ὡς", translit: "hōs",      gloss: "as, like, when" },
};

export const HEBREW: Record<string, StrongsEntry> = {
	"1":   { lemma: "אָב", translit: "ʾab",     gloss: "father" },
	"120": { lemma: "אָדָם", translit: "ʾadam",  gloss: "man, mankind, Adam" },
	"127": { lemma: "אֲדָמָה", translit: "ʾadamah", gloss: "ground, earth" },
	"136": { lemma: "אֲדֹנָי", translit: "ʾadonay", gloss: "Lord, my Lord" },
	"168": { lemma: "אֹהֶל", translit: "ʾohel",   gloss: "tent" },
	"259": { lemma: "אֶחָד", translit: "ʾeḥad",  gloss: "one, unique" },
	"376": { lemma: "אִישׁ", translit: "ʾish",    gloss: "man, husband" },
	"410": { lemma: "אֵל", translit: "ʾel",     gloss: "God, mighty" },
	"430": { lemma: "אֱלֹהִים", translit: "ʾelohim", gloss: "God, gods" },
	"559": { lemma: "אָמַר", translit: "ʾamar",   gloss: "to say, speak" },
	"776": { lemma: "אֶרֶץ", translit: "ʾerets",  gloss: "land, earth" },
	"802": { lemma: "אִשָּׁה", translit: "ʾishah", gloss: "woman, wife" },
	"853": { lemma: "אֵת", translit: "ʾet",     gloss: "(direct object marker)" },
	"935": { lemma: "בּוֹא", translit: "bo'",     gloss: "to come, go in" },
	"995": { lemma: "בִּין", translit: "bin",     gloss: "to discern, understand" },
	"1004": { lemma: "בַּיִת", translit: "bayit", gloss: "house" },
	"1121": { lemma: "בֵּן", translit: "ben",     gloss: "son" },
	"1242": { lemma: "בֹּקֶר", translit: "boqer",  gloss: "morning" },
	"1285": { lemma: "בְּרִית", translit: "berit", gloss: "covenant" },
	"1288": { lemma: "בָּרַךְ", translit: "barak", gloss: "to bless, kneel" },
	"1697": { lemma: "דָּבָר", translit: "dabar",  gloss: "word, thing, matter" },
	"2088": { lemma: "זֶה", translit: "zeh",     gloss: "this" },
	"2398": { lemma: "חָטָא", translit: "ḥata'",  gloss: "to sin, miss" },
	"2403": { lemma: "חַטָּאת", translit: "ḥaṭṭa't", gloss: "sin, sin offering" },
	"2617": { lemma: "חֶסֶד", translit: "ḥesed",  gloss: "lovingkindness, covenant loyalty" },
	"2896": { lemma: "טוֹב", translit: "tov",     gloss: "good" },
	"3068": { lemma: "יְהֹוָה", translit: "YHWH",  gloss: "Yahweh, the LORD" },
	"3091": { lemma: "יְהוֹשֻׁעַ", translit: "Yehoshua", gloss: "Joshua, Yeshua" },
	"3117": { lemma: "יוֹם", translit: "yom",     gloss: "day" },
	"3478": { lemma: "יִשְׂרָאֵל", translit: "Yisra'el", gloss: "Israel" },
	"3548": { lemma: "כֹּהֵן", translit: "kohen",  gloss: "priest" },
	"3605": { lemma: "כֹּל", translit: "kol",     gloss: "all, every" },
	"3808": { lemma: "לֹא", translit: "lo'",     gloss: "no, not" },
	"3820": { lemma: "לֵב", translit: "leb",     gloss: "heart, mind" },
	"3947": { lemma: "לָקַח", translit: "laqaḥ",  gloss: "to take, receive" },
	"4191": { lemma: "מוּת", translit: "mut",     gloss: "to die" },
	"4428": { lemma: "מֶלֶךְ", translit: "melek",  gloss: "king" },
	"5030": { lemma: "נָבִיא", translit: "navi'",  gloss: "prophet" },
	"5414": { lemma: "נָתַן", translit: "natan",   gloss: "to give, set, place" },
	"5650": { lemma: "עֶבֶד", translit: "'ebed",  gloss: "servant, slave" },
	"5769": { lemma: "עוֹלָם", translit: "'olam",  gloss: "forever, eternity, age" },
	"5971": { lemma: "עַם", translit: "'am",      gloss: "people, nation" },
	"6213": { lemma: "עָשָׂה", translit: "'asah",  gloss: "to do, make" },
	"6256": { lemma: "עֵת", translit: "'et",      gloss: "time, season" },
	"6680": { lemma: "צָוָה", translit: "tsavah", gloss: "to command, charge" },
	"6743": { lemma: "צָלַח", translit: "tsalaḥ", gloss: "to prosper, succeed" },
	"6944": { lemma: "קֹדֶשׁ", translit: "qodesh", gloss: "holiness, holy thing" },
	"7121": { lemma: "קָרָא", translit: "qara'",  gloss: "to call, proclaim, read" },
	"7225": { lemma: "רֵאשִׁית", translit: "re'shit", gloss: "beginning, first" },
	"7307": { lemma: "רוּחַ", translit: "ruaḥ",    gloss: "spirit, wind, breath" },
	"7451": { lemma: "רָע", translit: "ra'",      gloss: "evil, bad" },
	"7563": { lemma: "רָשָׁע", translit: "rasha'", gloss: "wicked, guilty" },
	"7965": { lemma: "שָׁלוֹם", translit: "shalom", gloss: "peace, wholeness" },
	"8085": { lemma: "שָׁמַע", translit: "shama'", gloss: "to hear, obey" },
	"8104": { lemma: "שָׁמַר", translit: "shamar", gloss: "to keep, guard" },
	"8064": { lemma: "שָׁמַיִם", translit: "shamayim", gloss: "heavens, sky" },
	"8267": { lemma: "שֶׁקֶר", translit: "sheqer", gloss: "lie, falsehood" },
	"8451": { lemma: "תּוֹרָה", translit: "torah", gloss: "instruction, law, Torah" },
};

const userExtraGreek: Record<string, StrongsEntry> = {};
const userExtraHebrew: Record<string, StrongsEntry> = {};

export function setUserStrongs(map: { greek?: Record<string, StrongsEntry>; hebrew?: Record<string, StrongsEntry> }): void {
	for (const k of Object.keys(userExtraGreek)) delete userExtraGreek[k];
	for (const k of Object.keys(userExtraHebrew)) delete userExtraHebrew[k];
	if (map.greek) Object.assign(userExtraGreek, map.greek);
	if (map.hebrew) Object.assign(userExtraHebrew, map.hebrew);
}

export function lookupStrongs(kind: "G" | "H", num: string): StrongsEntry | null {
	const n = num.replace(/^0+/, "") || num;
	if (kind === "G") return userExtraGreek[n] ?? GREEK[n] ?? null;
	return userExtraHebrew[n] ?? HEBREW[n] ?? null;
}
