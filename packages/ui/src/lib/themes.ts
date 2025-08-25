export type Theme = "light" | "dark" | "system";

export const themes: Record<Theme, { name: string; displayName: string }> = {
  light: {
    name: "light",
    displayName: "Light",
  },
  dark: {
    name: "dark",
    displayName: "Dark",
  },
  system: {
    name: "system",
    displayName: "System",
  },
};

export const defaultTheme: Theme = "system";