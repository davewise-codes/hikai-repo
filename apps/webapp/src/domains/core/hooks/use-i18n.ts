import { useUserPreferences } from './use-user-preferences';

/**
 * Hook para gestionar la internacionalización desde el dominio core
 */
export function useI18n() {
  const { locale, setLocale } = useUserPreferences();
  
  return {
    locale,
    setLocale,
  } as const;
}

// Types are exported from hooks/index.ts
