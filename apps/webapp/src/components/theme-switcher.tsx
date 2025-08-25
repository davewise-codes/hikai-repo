import { themes, type Theme } from "@hikai/ui";
import { Button } from "@hikai/ui";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">Theme:</span>
      {Object.entries(themes).map(([key, { displayName }]) => (
        <Button
          key={key}
          variant={theme === key ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme(key as Theme)}
        >
          {displayName}
        </Button>
      ))}
    </div>
  );
}