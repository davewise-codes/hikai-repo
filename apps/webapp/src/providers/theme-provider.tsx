import { createContext, ReactNode, useEffect, useState } from "react";
import { Theme } from "@hikai/ui";
import { useTheme } from "@/domains/core";

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
	enableSystem = true,
}: ThemeProviderProps) {
	const { theme, setTheme: setThemeStore } = useTheme();
	const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

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

	const value: ThemeContextValue = {
		theme,
		setTheme: setThemeStore,
		actualTheme,
	};

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export { ThemeContext };
