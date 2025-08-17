import { ReactNode, useEffect } from "react";
import { I18nextProvider, useTranslation as useTranslationBase } from "react-i18next";
import { i18n, setLanguage } from "../core";

export interface I18nProviderProps {
  lang: string;
  children: ReactNode;
}

/**
 * React provider that keeps the i18n instance in sync with the selected
 * language. Intended for React apps that are not using Next.js.
 */
export function I18nProvider({ lang, children }: I18nProviderProps) {
  useEffect(() => {
    setLanguage(lang);
  }, [lang]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export const useTranslation = useTranslationBase;
