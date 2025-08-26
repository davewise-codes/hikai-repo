import { useStore } from '@/store';

/**
 * Hook para gestionar la internacionalización desde el dominio core
 */
export function useI18n() {
  const locale = useStore(state => state.locale);
  const setLocale = useStore(state => state.setLocale);
  
  return {
    locale,
    setLocale,
  } as const;
}

// Types are exported from hooks/index.ts