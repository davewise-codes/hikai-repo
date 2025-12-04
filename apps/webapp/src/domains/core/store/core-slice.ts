import { StateCreator } from 'zustand';
import { Theme, defaultTheme } from '@hikai/ui';

// Supported locales
export type Locale = 'en' | 'es';
export const defaultLocale: Locale = 'en';

// Core slice interface - todo lo transversal y compartido
export interface CoreSlice {
  // Theme settings
  theme: Theme;
  setTheme: (newTheme: Theme) => void;

  // I18n settings
  locale: Locale;
  setLocale: (newLocale: Locale) => void;

  // Current organization
  currentOrgId: string | null;
  setCurrentOrgId: (id: string | null) => void;
}

export const createCoreSlice: StateCreator<CoreSlice, [], [], CoreSlice> = (set) => ({
  // Theme management
  theme: defaultTheme,
  setTheme: (newTheme) => set({ theme: newTheme }),

  // I18n management
  locale: defaultLocale,
  setLocale: (newLocale) => set({ locale: newLocale }),

  // Current organization management
  currentOrgId: null,
  setCurrentOrgId: (id) => set({ currentOrgId: id }),
});