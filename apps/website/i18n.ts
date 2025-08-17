import { loadDictionaries } from "@hikai/i18n";
import en from "@hikai/locales/website/en.json";
import es from "@hikai/locales/website/es.json";

loadDictionaries(
  { fallbackLng: "en", supportedLngs: ["en", "es"], defaultNS: "website" },
  { en: { website: en }, es: { website: es } }
);

export {};
