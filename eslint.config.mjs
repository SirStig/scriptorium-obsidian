import path from "node:path";
import { fileURLToPath } from "node:url";
import obsidianmd from "eslint-plugin-obsidianmd";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
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
		},
	},
	{
		files: ["src/settings.ts"],
		rules: {
			"obsidianmd/ui/sentence-case": "off",
		},
	},
];
