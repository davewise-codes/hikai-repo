import { useStore } from '@/store';

/**
 * Hook para gestionar el tamaño de fuente de la aplicación
 */
export function useFontSize() {
  const fontSize = useStore((state) => state.fontSize);
  const setFontSize = useStore((state) => state.setFontSize);

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
