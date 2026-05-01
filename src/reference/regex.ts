/*
 * Single-source-of-truth inline-reference regex.
 *
 * Captures forms we want the parser to see:
 *   "John 3"                book + chapter
 *   "John 3:16"             + verse
 *   "John 3:16-20"          + verse range
 *   "John 3:16-4:2"         cross-chapter range
 *   "John 3-4"              chapter range
 *   "John 3:16-4"           verse-to-chapter range
 *
 * The first book-name word must start with an uppercase letter. That's the
 * one disambiguator that lets us match chapter-only refs like "Genesis 1"
 * without false-positives on prose like "see 1 John 4:8" (where "see 1"
 * would otherwise greedily eat the leading numbered-book prefix).
 *
 * Validity is decided by `parseReference`, not the regex. The regex is only a
 * net to find candidate spans in arbitrary text. OSIS dot form ("Jn.3.16") is
 * routed separately through `tryParseOsisLike`.
 */

export const INLINE_REF_PATTERN =
	"\\b((?:[1-3]\\s+)?[A-Z][a-zA-Z'.]*(?:\\s+[a-zA-Z][a-zA-Z'.]*){0,3}\\s+\\d+(?:\\s*[:.]\\s*\\d+)?(?:\\s*[-\\u2013\\u2014]\\s*\\d+(?:\\s*[:.]\\s*\\d+)?)?)\\b";

export function inlineRefRegex(flags = "g"): RegExp {
	return new RegExp(INLINE_REF_PATTERN, flags);
}
