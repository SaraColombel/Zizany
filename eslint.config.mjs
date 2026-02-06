import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,

	// Override default ignores of eslint-config-next.
	globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**", "generated/**"]),

	// Règles globales
	{
		plugins: {
			"unused-imports": unusedImports,
		},

		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/consistent-type-definitions": ["error", "interface"],

			complexity: ["error", 11],
			"max-params": ["error", 3],

			"no-nested-ternary": "error",
			"no-implicit-coercion": "error",

			"prefer-const": "error",
			"unused-imports/no-unused-imports": "error",
		},
	},

	// Exception pour les composants
	{
		files: ["src/components/**/*.{ts,tsx}"],
		rules: {
			complexity: "off",
			"max-params": "off",
		},
	},
]);

export default eslintConfig;
