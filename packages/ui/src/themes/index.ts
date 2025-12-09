/**
 * Color Themes Index
 *
 * This file imports all theme CSS files (side-effect imports)
 * and re-exports the color theme utilities.
 *
 * To add a new theme:
 * 1. Create the CSS file in this directory (e.g., ocean.css)
 * 2. Add the import below
 * 3. Add the theme to colorThemes in ../lib/color-themes.ts
 */

// Import theme CSS files (side-effect imports)
import "./default.css";
import "./amber-minimal.css";
import "./dark-matter.css";

// Re-export color theme utilities
export {
	type ColorThemeId,
	type ColorTheme,
	colorThemes,
	defaultColorTheme,
	getColorThemeClass,
	getColorThemeIds,
	isValidColorThemeId,
} from "../lib/color-themes";
