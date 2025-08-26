import { useStore } from '@/store';

/**
 * Hook para gestionar el tema de la aplicación desde el dominio core
 */
export function useTheme() {
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  
  return {
    theme,
    setTheme,
  } as const;
}

// Types are exported from hooks/index.ts