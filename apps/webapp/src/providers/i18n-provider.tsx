import * as React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { useI18n } from '@/domains/core';

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { locale } = useI18n();
  
  // Sync i18n with store locale on mount and when locale changes
  React.useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  // Initialize store with current i18n language if store is empty
  React.useEffect(() => {
    if (!locale && i18n.language) {
      // This will be handled by the language-selector when it first renders
      // or we could add a setLocale call here if needed
    }
  }, [locale]);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}