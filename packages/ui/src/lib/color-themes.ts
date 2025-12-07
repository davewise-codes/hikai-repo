/**
 * Color Theme System
 *
 * Defines the available color themes and utilities for managing them.
 * Themes are defined in CSS files in ../themes/ directory.
 */

// Available color theme IDs
export type ColorThemeId = 'default' | 'amber-minimal' | 'dark-matter' | 'neo-brutalism';

// Color theme metadata
export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  description: string;
}

// Registry of available color themes
export const colorThemes: Record<ColorThemeId, ColorTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Hikai default theme',
  },
  'amber-minimal': {
    id: 'amber-minimal',
    name: 'Amber Minimal',
    description: 'Warm amber tones with minimal aesthetic',
  },
  'dark-matter': {
    id: 'dark-matter',
    name: 'Dark Matter',
    description: 'Sophisticated dark theme with coral accents',
  },
  'neo-brutalism': {
    id: 'neo-brutalism',
    name: 'Neo Brutalism',
    description: 'Bold high-contrast theme with hard shadows',
  },
};

// Default color theme
export const defaultColorTheme: ColorThemeId = 'default';

/**
 * Get the CSS class name for a color theme
 * @param themeId - The color theme ID
 * @returns The CSS class name (e.g., "theme-default")
 */
export function getColorThemeClass(themeId: ColorThemeId): string {
  return `theme-${themeId}`;
}

/**
 * Get all available color theme IDs
 * @returns Array of color theme IDs
 */
export function getColorThemeIds(): ColorThemeId[] {
  return Object.keys(colorThemes) as ColorThemeId[];
}

/**
 * Check if a string is a valid color theme ID
 * @param id - The string to check
 * @returns True if the string is a valid ColorThemeId
 */
export function isValidColorThemeId(id: string): id is ColorThemeId {
  return id in colorThemes;
}
