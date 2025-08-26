"use client";

import { Sun, Moon, Button } from "@hikai/ui";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSwitcher() {
	const { theme, setTheme, actualTheme } = useTheme();

	const toggleTheme = () => {
		// Simple toggle between light and dark
		if (actualTheme === "dark") {
			setTheme("light");
		} else {
			setTheme("dark");
		}
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			aria-label={`Switch to ${actualTheme === "dark" ? "light" : "dark"} theme`}
			className="h-9 w-9"
		>
			{actualTheme === "dark" ? (
				<Sun className="h-4 w-4" />
			) : (
				<Moon className="h-4 w-4" />
			)}
		</Button>
	);
}