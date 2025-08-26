"use client";

import { themes, type Theme, Sun, Moon, Monitor } from "@hikai/ui";
import { Button } from "@hikai/ui";
import { useTheme } from "@/hooks/use-theme";

const getThemeIcon = (themeKey: string) => {
  switch (themeKey) {
    case 'light':
      return <Sun className="h-4 w-4" />;
    case 'dark':
      return <Moon className="h-4 w-4" />;
    case 'system':
      return <Monitor className="h-4 w-4" />;
    default:
      return null;
  }
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      {Object.entries(themes).map(([key, { displayName }]) => (
        <Button
          key={key}
          variant={theme === key ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme(key as Theme)}
          className="flex items-center gap-2"
        >
          {getThemeIcon(key)}
          {displayName}
        </Button>
      ))}
    </div>
  );
}