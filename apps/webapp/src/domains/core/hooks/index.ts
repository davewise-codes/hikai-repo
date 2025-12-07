// Export all core hooks
export { useTheme } from './use-theme';
export { useFontSize, useDensity } from './use-density';
export { useColorTheme } from './use-color-theme';
export { useI18n } from './use-i18n';

// Export types from their original sources
export type { Theme, FontSize, Density, ColorThemeId } from '@hikai/ui';
export type { Locale } from '../store/core-slice';