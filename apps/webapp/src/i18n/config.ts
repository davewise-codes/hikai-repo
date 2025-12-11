import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';
import enAuth from './locales/en/auth.json';
import esAuth from './locales/es/auth.json';
import enOrganizations from './locales/en/organizations.json';
import esOrganizations from './locales/es/organizations.json';
import enProducts from './locales/en/products.json';
import esProducts from './locales/es/products.json';
import enProfile from './locales/en/profile.json';
import esProfile from './locales/es/profile.json';
import enConnectors from './locales/en/connectors.json';
import esConnectors from './locales/es/connectors.json';
import enTimeline from './locales/en/timeline.json';
import esTimeline from './locales/es/timeline.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    organizations: enOrganizations,
    products: enProducts,
    profile: enProfile,
    connectors: enConnectors,
    timeline: enTimeline,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    organizations: esOrganizations,
    products: esProducts,
    profile: esProfile,
    connectors: esConnectors,
    timeline: esTimeline,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
