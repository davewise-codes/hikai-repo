"use client";

import { createContext, ReactNode, useEffect, useState } from "react";
import {
	ColorThemeId,
	Theme,
	defaultColorTheme,
	defaultTheme,
	getColorThemeClass,
	getColorThemeIds,
	isValidColorThemeId,
} from "@hikai/ui";

export interface ThemeContextValue {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	actualTheme: "light" | "dark";
	colorTheme: ColorThemeId;
	setColorTheme: (theme: ColorThemeId) => void;
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
	const lockedTheme: Theme = "dark";
	const lockedColorTheme: ColorThemeId = "amber-minimal";
	const [theme, setThemeState] = useState<Theme>(initialTheme ?? lockedTheme);
	const [actualTheme, setActualTheme] = useState<"light" | "dark">("dark");
	const [colorTheme, setColorThemeState] =
		useState<ColorThemeId>(lockedColorTheme);

	useEffect(() => {
		setThemeState(lockedTheme);
		setColorThemeState(lockedColorTheme);
	}, []);

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

	useEffect(() => {
		const root = window.document.documentElement;

		getColorThemeIds().forEach((themeId) => {
			root.classList.remove(getColorThemeClass(themeId));
		});

		root.classList.add(getColorThemeClass(colorTheme));
	}, [colorTheme]);

	const setTheme = (newTheme: Theme) => {
		localStorage.setItem(storageKey, newTheme);
		setThemeState(newTheme);
	};

	const setColorTheme = (newTheme: ColorThemeId) => {
		localStorage.setItem("hikai-color-theme", newTheme);
		setColorThemeState(newTheme);
	};

	const value: ThemeContextValue = {
		theme,
		setTheme,
		actualTheme,
		colorTheme,
		setColorTheme,
	};

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext };
