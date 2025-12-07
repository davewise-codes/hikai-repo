import { StateCreator } from 'zustand';
import {
  Theme,
  defaultTheme,
  Density,
  defaultDensity,
  ColorThemeId,
  defaultColorTheme,
} from '@hikai/ui';

// Supported locales
export type Locale = 'en' | 'es';
export const defaultLocale: Locale = 'en';

// Core slice interface - todo lo transversal y compartido
export interface CoreSlice {
  // Theme settings
  theme: Theme;
  setTheme: (newTheme: Theme) => void;

  // Density settings
  density: Density;
  setDensity: (newDensity: Density) => void;

  // Color theme settings
  colorTheme: ColorThemeId;
  setColorTheme: (newColorTheme: ColorThemeId) => void;

  // I18n settings
  locale: Locale;
  setLocale: (newLocale: Locale) => void;

  // Current organization
  currentOrgId: string | null;
  setCurrentOrgId: (id: string | null) => void;

  // Current product
  currentProductId: string | null;
  setCurrentProductId: (id: string | null) => void;

  // Sidebar state (not persisted)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const createCoreSlice: StateCreator<CoreSlice, [], [], CoreSlice> = (set) => ({
  // Theme management
  theme: defaultTheme,
  setTheme: (newTheme) => set({ theme: newTheme }),

  // Density management
  density: defaultDensity,
  setDensity: (newDensity) => set({ density: newDensity }),

  // Color theme management
  colorTheme: defaultColorTheme,
  setColorTheme: (newColorTheme) => set({ colorTheme: newColorTheme }),

  // I18n management
  locale: defaultLocale,
  setLocale: (newLocale) => set({ locale: newLocale }),

  // Current organization management
  currentOrgId: null,
  setCurrentOrgId: (id) => set({ currentOrgId: id }),

  // Current product management
  currentProductId: null,
  setCurrentProductId: (id) => set({ currentProductId: id }),

  // Sidebar management (not persisted - closes on reload)
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
});