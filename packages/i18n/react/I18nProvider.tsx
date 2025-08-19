import { type ReactNode } from "react";
import { initI18n, type I18nConfig, type Translations } from "../core";
import { syncLanguage } from "./syncLanguage";

interface I18nProviderProps {
  config: I18nConfig;
  translations: Translations;
  lang?: string;
  children: ReactNode;
}

// Initializes i18n and optionally sets the initial language.
export function I18nProvider({
  config,
  translations,
  lang,
  children,
}: I18nProviderProps) {
  initI18n(config, translations);
  if (lang) {
    syncLanguage(lang);
  }
  return <>{children}</>;
}
