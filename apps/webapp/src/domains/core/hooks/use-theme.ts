import { useUserPreferences } from './use-user-preferences';

/**
 * Hook para gestionar el tema de la aplicación desde el dominio core
 */
export function useTheme() {
	const { theme, setTheme } = useUserPreferences();

	return {
		theme,
		setTheme,
	} as const;
}

// Types are exported from hooks/index.ts
