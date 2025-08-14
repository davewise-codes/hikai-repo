/** @type {import('tailwindcss').Config} */
import preset from "@hikai/tailwind-config";

export default {
	content: [
		"./index.html",
		"./src/**/*.{ts,tsx}", // los componentes de ui
		"../../packages/ui/src/**/*.{ts,tsx}",
	],
	presets: [preset],
	theme: {
		extend: {},
	},
};
