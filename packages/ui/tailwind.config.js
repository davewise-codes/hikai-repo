/** @type {import('tailwindcss').Config} */
import preset from "@hikai/tailwind-config";

export default {
	content: ["./src/**/*.{ts,tsx}"],
	presets: [preset],
	theme: {
		extend: {},
	},
};
