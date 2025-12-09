/**
 * HybridStorage: Storage personalizado para Convex Auth que permite
 * múltiples usuarios en diferentes pestañas del navegador.
 *
 * Comportamiento:
 * - Usa sessionStorage como storage principal (aislamiento por pestaña)
 * - Al iniciar, si sessionStorage está vacío, copia de localStorage (herencia)
 * - Mantiene localStorage actualizado como "plantilla" para nuevas pestañas
 * - Cada pestaña puede hacer logout/login independiente
 */

// Flag para controlar si ya se hizo la herencia inicial
let hasInheritedFromLocalStorage = false;

export const hybridStorage = {
  getItem(key: string): string | null {
    // Primero intentar sessionStorage
    const sessionValue = sessionStorage.getItem(key);

    if (sessionValue !== null) {
      return sessionValue;
    }

    // Si sessionStorage está vacío y no hemos heredado aún, copiar de localStorage
    if (!hasInheritedFromLocalStorage) {
      hasInheritedFromLocalStorage = true;
      const localValue = localStorage.getItem(key);

      if (localValue !== null) {
        // Copiar a sessionStorage para esta pestaña
        sessionStorage.setItem(key, localValue);
        return localValue;
      }
    }

    return null;
  },

  setItem(key: string, value: string): void {
    // Guardar en sessionStorage (storage principal de esta pestaña)
    sessionStorage.setItem(key, value);

    // También actualizar localStorage como plantilla para nuevas pestañas
    localStorage.setItem(key, value);
  },

  removeItem(key: string): void {
    // Eliminar de sessionStorage (esta pestaña)
    sessionStorage.removeItem(key);

    // NO eliminar de localStorage - otras pestañas pueden necesitarlo
    // Cada pestaña gestiona su propia sesión
  },
};
