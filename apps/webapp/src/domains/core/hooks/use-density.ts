import { useStore } from '@/store';

/**
 * Hook para gestionar la densidad de información de la aplicación
 */
export function useDensity() {
  const density = useStore((state) => state.density);
  const setDensity = useStore((state) => state.setDensity);

  return {
    density,
    setDensity,
  } as const;
}
