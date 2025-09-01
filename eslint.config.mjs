import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default [
	{
		files: ["**/*.{js,ts,jsx,tsx}"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.browser,
				...globals.es2021,
			},
		},
		plugins: {
			react: reactPlugin,
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			// Reglas base recomendadas
			...js.configs.recommended.rules,
			...tseslint.configs.recommended.rules,
			...reactPlugin.configs.recommended.rules,

			// Desactivar reglas ruidosas o no necesarias de inicio
			"react/react-in-jsx-scope": "off",
			"react/jsx-no-target-blank": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "off",

			// Fixes para falsos positivos
			"no-unused-vars": "off", // Desactivar la regla base de JS
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					"argsIgnorePattern": "^_", // Ignorar parámetros que empiecen con _
					"varsIgnorePattern": "^_", // Ignorar variables que empiecen con _
					"ignoreRestSiblings": true
				}
			],
			"no-undef": "off", // TypeScript ya maneja esto mejor
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build/**",
			"**/coverage/**",
			"**/*.css",
		],
	},
];
