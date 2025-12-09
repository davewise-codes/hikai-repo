import { useUserPreferences } from './use-user-preferences';

/**
 * Hook para gestionar el tamaño de fuente de la aplicación
 */
export function useFontSize() {
  const { fontSize, setFontSize } = useUserPreferences();

  return {
    fontSize,
    setFontSize,
  } as const;
}

// Backwards compatibility alias (deprecated)
export function useDensity() {
  const { fontSize, setFontSize } = useFontSize();
  return {
    density: fontSize,
    setDensity: setFontSize,
  } as const;
}
