export type FontSize = "compact" | "normal" | "comfortable";

export interface FontSizeConfig {
  name: FontSize;
  displayName: string;
  description: string;
}

export const fontSizes: Record<FontSize, FontSizeConfig> = {
  compact: {
    name: "compact",
    displayName: "Compact",
    description: "Smaller text",
  },
  normal: {
    name: "normal",
    displayName: "Normal",
    description: "Default size",
  },
  comfortable: {
    name: "comfortable",
    displayName: "Comfortable",
    description: "Larger text",
  },
};

export const defaultFontSize: FontSize = "normal";

/**
 * Helper to get the CSS class for a font size level
 */
export function getFontSizeClass(fontSize: FontSize): string {
  return `font-size-${fontSize}`;
}

// Backwards compatibility aliases (deprecated)
export type Density = FontSize;
export const densities = fontSizes;
export const defaultDensity = defaultFontSize;
export const getDensityClass = getFontSizeClass;
