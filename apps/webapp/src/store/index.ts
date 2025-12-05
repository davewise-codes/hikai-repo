import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { CoreSlice, createCoreSlice } from '@/domains/core/store/core-slice';

// Store State - combina slices de todos los dominios
interface StoreState extends CoreSlice {
  // Futuros slices de otros dominios se añadirán aquí
}

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...createCoreSlice(...args),
        // Futuros slices de otros dominios se añadirán aquí
      }),
      {
        name: 'hikai-store',
        partialize: (state) => ({
          theme: state.theme,
          locale: state.locale,
          currentOrgId: state.currentOrgId,
          currentProductId: state.currentProductId,
        }),
      }
    ),
    { name: 'hikai-store' }
  )
);

// NOTA: No sincronizamos entre pestañas porque todas las preferencias
// (theme, locale, currentOrgId) son específicas del usuario.
// Si dos usuarios distintos están en pestañas diferentes, no queremos
// que los cambios de uno afecten al otro.