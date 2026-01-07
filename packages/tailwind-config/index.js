/** @type {import('tailwindcss').Config} */
const preset = {
	darkMode: "class",
	theme: {
		extend: {
			borderRadius: {
				xs: "var(--radius-xs)",
				sm: "var(--radius-sm)",
				md: "var(--radius-md)",
				lg: "var(--radius-lg)",
				xl: "var(--radius-xl)",
				"2xl": "var(--radius-2xl)",
				"3xl": "var(--radius-3xl)",
			},
			zIndex: {
				base: "var(--z-base)",
				dropdown: "var(--z-dropdown)",
				sticky: "var(--z-sticky)",
				fixed: "var(--z-fixed)",
				"modal-backdrop": "var(--z-modal-backdrop)",
				modal: "var(--z-modal)",
				popover: "var(--z-popover)",
				tooltip: "var(--z-tooltip)",
				notification: "var(--z-notification)",
			},
			boxShadow: {
				sm: "var(--shadow-sm)",
				md: "var(--shadow-md)",
				lg: "var(--shadow-lg)",
				xl: "var(--shadow-xl)",
			},
			transitionDuration: {
				fast: "var(--duration-fast)",
				normal: "var(--duration-normal)",
				slow: "var(--duration-slow)",
				slower: "var(--duration-slower)",
			},
			transitionTimingFunction: {
				"ease-in": "var(--ease-in)",
				"ease-out": "var(--ease-out)",
				"ease-in-out": "var(--ease-in-out)",
				bounce: "var(--ease-bounce)",
			},
			colors: {
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				success: {
					DEFAULT: "hsl(var(--success))",
					foreground: "hsl(var(--success-foreground))",
				},
				warning: {
					DEFAULT: "hsl(var(--warning))",
					foreground: "hsl(var(--warning-foreground))",
				},
				"brand-primary": "hsl(var(--brand-primary))",
				"brand-primary-inverse": "hsl(var(--brand-primary-inverse))",
				"brand-primary-light": "hsl(var(--brand-primary-light))",
				"brand-primary-dark": "hsl(var(--brand-primary-dark))",
				"brand-primary-inverse-light":
					"hsl(var(--brand-primary-inverse-light))",
				"brand-primary-inverse-dark":
					"hsl(var(--brand-primary-inverse-dark))",
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				chart: {
					1: "hsl(var(--chart-1))",
					2: "hsl(var(--chart-2))",
					3: "hsl(var(--chart-3))",
					4: "hsl(var(--chart-4))",
					5: "hsl(var(--chart-5))",
				},
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				serif: ["Playfair Display", "Georgia", "serif"],
				mono: ["JetBrains Mono", "Consolas", "monospace"],
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
export default preset;
