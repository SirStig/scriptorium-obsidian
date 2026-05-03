import path from "node:path";
import { fileURLToPath } from "node:url";
import obsidianmd from "eslint-plugin-obsidianmd";
import { DEFAULT_BRANDS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js";
import { DEFAULT_ACRONYMS } from "eslint-plugin-obsidianmd/dist/lib/rules/ui/acronyms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const customBrands = [
	"Scriptorium",
	"Logos",
	"Olive Tree",
	"Blue Letter Bible",
	"API.Bible",
	"Bible",
	"bible.com",
	"biblia.com",
	"Apocrypha",
	"Pentateuch",
	"Wisdom",
	"Prophets",
	"Gospels",
	"Epistles",
	"Tobit",
	"Judith",
	"Sirach",
	"Baruch",
	"Maccabees",
	"John",
	"Strong's",
	"World English Bible",
	"King James Version",
	"American Standard Version",
	"Bible in Basic English",
	"Open English Bible",
	"Darby Bible",
	"Young's Literal Translation",
	"Douay–Rheims American",
	"Clementine Vulgate",
	"Hotkeys",
	"Settings",
	"Publish",
	"STEP Bible",
	"STEP",
	"Catholic",
	"Latin",
	"English",
	"Commonwealth",
	"Greek",
	"Hebrew",
	"Free Bible API",
	"ESV API",
	"Vault",
];
const customAcronyms = [
	"KJV", "ASV", "BBE", "NIV", "NASB", "LSB", "YLT", "DRA", "OEB", "ESV",
	"NRSV", "NLT", "TSK", "OSIS", "ISO", "README", "URI", "US", "CC0",
];
const sentenceCaseIgnoreWords = ["WEB", "UIs", "URIs", "YYYY-MM-DD"];

const sentenceCaseBrands = [...new Set([...DEFAULT_BRANDS, ...customBrands])];
const sentenceCaseAcronyms = [...new Set([...DEFAULT_ACRONYMS, ...customAcronyms])];

export default [
	{ ignores: ["node_modules/**", "main.js", "scripts/**"] },
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: __dirname,
			},
		},
	},
	{
		files: ["src/**/*.ts", "tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"import/no-extraneous-dependencies": [
				"error",
				{
					devDependencies: true,
					peerDependencies: true,
				},
			],
			"obsidianmd/prefer-active-doc": "off",
			"obsidianmd/prefer-create-el": "off",
			"obsidianmd/prefer-instanceof": "off",
			"obsidianmd/object-assign": "off",
			"obsidianmd/ui/sentence-case": [
				"error",
				{
					brands: sentenceCaseBrands,
					acronyms: sentenceCaseAcronyms,
					ignoreWords: sentenceCaseIgnoreWords,
					allowAutoFix: true,
				},
			],
		},
	},
];
