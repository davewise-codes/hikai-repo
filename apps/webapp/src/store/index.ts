import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { CoreSlice, createCoreSlice } from '@/domains/core/store/core-slice';
import { AuthSlice, createAuthSlice } from '@/domains/auth/store/auth-slice';

// Store State - combina slices de todos los dominios
interface StoreState extends CoreSlice, AuthSlice {
  // Futuros slices de otros dominios se añadirán aquí
}

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (...args) => ({
        ...createCoreSlice(...args),
        ...createAuthSlice(...args),
        // Futuros slices de otros dominios se añadirán aquí
      }),
      {
        name: 'hikai-store',
        partialize: (state) => ({
          // Solo persistir lo necesario del core
          theme: state.theme,
          locale: state.locale,
          // Auth state ya no se persiste - Convex maneja la persistencia
        }),
      }
    ),
    { name: 'hikai-store' }
  )
);

// Sincronización entre pestañas
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    // Solo reaccionar a cambios en nuestro store
    if (e.key === 'hikai-store' && e.newValue) {
      try {
        const newData = JSON.parse(e.newValue);
        
        // Actualizar solo las propiedades que persisten
        if (newData.state) {
          useStore.setState({
            theme: newData.state.theme,
            locale: newData.state.locale,
            // Auth state se sincroniza automáticamente via Convex
          });
        }
      } catch (error) {
        console.warn('Error parsing localStorage data for sync:', error);
      }
    }
  });
}