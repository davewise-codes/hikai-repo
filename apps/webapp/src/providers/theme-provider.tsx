import { createContext, ReactNode, useEffect, useState } from "react";
import { Theme, getColorThemeClass, getColorThemeIds, ColorThemeId } from "@hikai/ui";
import { useTheme, useColorTheme } from "@/domains/core";

export interface ThemeContextValue {
	theme: Theme;
	 
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
	const { colorTheme } = useColorTheme();
	const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

	// Apply light/dark theme class
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

	// Apply color theme class
	useEffect(() => {
		const root = window.document.documentElement;

		// Remove all color theme classes
		getColorThemeIds().forEach((themeId) => {
			root.classList.remove(getColorThemeClass(themeId));
		});

		// Add current color theme class
		root.classList.add(getColorThemeClass(colorTheme));
	}, [colorTheme]);

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
