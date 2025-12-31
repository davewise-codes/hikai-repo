"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	colorThemes,
	cn,
} from "@hikai/ui";
import { useTheme } from "@/hooks/use-theme";

interface ColorThemeSwitcherProps {
	triggerClassName?: string;
}

export function ColorThemeSwitcher({ triggerClassName }: ColorThemeSwitcherProps) {
	const { colorTheme, setColorTheme } = useTheme();
	const items = Object.values(colorThemes);

	return (
		<Select value={colorTheme} onValueChange={setColorTheme}>
			<SelectTrigger className={cn("h-9 w-[160px]", triggerClassName)}>
				<SelectValue placeholder="Theme" />
			</SelectTrigger>
			<SelectContent>
				{items.map((theme) => (
					<SelectItem key={theme.id} value={theme.id}>
						{theme.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
