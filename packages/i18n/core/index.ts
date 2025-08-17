import i18n, { type Resource } from "i18next";

export interface I18nConfig {
  fallbackLng: string;
  supportedLngs: string[];
  defaultNS: string;
}

export type Translations = Resource;

/**
 * Load dictionaries and initialise the i18next instance. This function is
 * environment agnostic and can be used from Node/CLI applications.
 */
export function loadDictionaries(
  config: I18nConfig,
  translations: Translations,
) {
  if (!i18n.isInitialized) {
    void i18n.init({
      fallbackLng: config.fallbackLng,
      supportedLngs: config.supportedLngs,
      resources: translations,
      defaultNS: config.defaultNS,
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    });
  }
}

// Backwards compatibility
export const initI18n = loadDictionaries;

export function setLanguage(lang: string) {
  const supported = i18n.options?.supportedLngs || [];
  const fallback =
    typeof i18n.options.fallbackLng === "string"
      ? i18n.options.fallbackLng
      : Array.isArray(i18n.options.fallbackLng)
        ? i18n.options.fallbackLng[0]
        : "en";
  const chosen = (supported as string[]).includes(lang) ? lang : fallback;
  if (i18n.language !== chosen) {
    void i18n.changeLanguage(chosen);
  }
}

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
}

// Backwards compatibility
export const getTranslation = t;

export { i18n };
