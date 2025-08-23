/** @type {import('tailwindcss').Config} */
import preset from "@hikai/tailwind-config";

export default {
	content: [
		"./src/**/*.{ts,tsx}", // la app website
		"../../packages/ui/src/**/*.{ts,tsx}", // los componentes del UI
	],
	presets: [preset],
};
