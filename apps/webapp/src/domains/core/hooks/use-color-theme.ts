import { useUserPreferences } from './use-user-preferences';

/**
 * Hook to access and update the color theme setting.
 * Color themes define the color palette (default, amber-minimal, dark-matter, etc.)
 *
 * @returns Object with colorTheme value and setColorTheme function
 */
export function useColorTheme() {
	const { colorTheme, setColorTheme } = useUserPreferences();
	return { colorTheme, setColorTheme };
}
