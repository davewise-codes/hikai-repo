import { createContext, ReactNode, useEffect, useState } from "react";
import { Theme, defaultTheme } from "@hikai/ui";

export interface ThemeContextValue {
	theme: Theme;
	// eslint-disable-next-line no-unused-vars
	setTheme: (newTheme: Theme) => void;
	actualTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
	children: ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
	enableSystem?: boolean;
}

export function ThemeProvider({
	children,
	defaultTheme: initialTheme = defaultTheme,
	storageKey = "theme",
	enableSystem = true,
}: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(initialTheme);
	const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		const stored = localStorage.getItem(storageKey) as Theme;
		if (stored) {
			setThemeState(stored);
		}
	}, [storageKey]);

	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");

		if (theme === "system" && enableSystem) {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";
			root.classList.add(systemTheme);
			setActualTheme(systemTheme);
		} else {
			const themeToApply = theme === "system" ? "light" : theme;
			root.classList.add(themeToApply);
			setActualTheme(themeToApply as "light" | "dark");
		}
	}, [theme, enableSystem]);

	const setTheme = (newTheme: Theme) => {
		localStorage.setItem(storageKey, newTheme);
		setThemeState(newTheme);
	};

	const value: ThemeContextValue = {
		theme,
		setTheme,
		actualTheme,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export { ThemeContext };
