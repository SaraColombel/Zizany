import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
	]),
	{
		plugins: {
			"unused-imports": unusedImports,
		},

		rules: {
			// Type any
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/consistent-type-definitions": ["error", "interface"],

			// Nombre de lignes dans une fonction
			complexity: ["error", 11],
			// Max param fonction
			"max-params": ["error", 3],

			// if
			"no-nested-ternary": "error",
			"no-implicit-coercion": "error",

			"prefer-const": "error",
			"unused-imports/no-unused-imports": "error",
		},
	},
]);

export default eslintConfig;
