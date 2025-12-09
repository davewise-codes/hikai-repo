import { StateCreator } from 'zustand';
import {
  Theme,
  defaultTheme,
  FontSize,
  defaultFontSize,
  ColorThemeId,
  defaultColorTheme,
} from '@hikai/ui';

// Supported locales
export type Locale = 'en' | 'es';
export const defaultLocale: Locale = 'en';

// Core slice interface - todo lo transversal y compartido
// NOTE: currentOrgId/currentProductId are now managed by useUserPreferences
// hook with user-scoped localStorage keys to support multi-user scenarios
export interface CoreSlice {
  // Theme settings
  theme: Theme;
  setTheme: (newTheme: Theme) => void;

  // Font size settings
  fontSize: FontSize;
  setFontSize: (newFontSize: FontSize) => void;

  // Color theme settings
  colorTheme: ColorThemeId;
  setColorTheme: (newColorTheme: ColorThemeId) => void;

  // I18n settings
  locale: Locale;
  setLocale: (newLocale: Locale) => void;

  // Sidebar state (not persisted)
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const createCoreSlice: StateCreator<CoreSlice, [], [], CoreSlice> = (set) => ({
  // Theme management
  theme: defaultTheme,
  setTheme: (newTheme) => set({ theme: newTheme }),

  // Font size management
  fontSize: defaultFontSize,
  setFontSize: (newFontSize) => set({ fontSize: newFontSize }),

  // Color theme management
  colorTheme: defaultColorTheme,
  setColorTheme: (newColorTheme) => set({ colorTheme: newColorTheme }),

  // I18n management
  locale: defaultLocale,
  setLocale: (newLocale) => set({ locale: newLocale }),

  // Sidebar management (not persisted - closes on reload)
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
});