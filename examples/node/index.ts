import { loadDictionaries, setLanguage, t } from "@hikai/i18n";

const resources = {
  en: { common: { hello: "Hello" } },
  es: { common: { hello: "Hola" } },
};

loadDictionaries(
  { fallbackLng: "en", supportedLngs: ["en", "es"], defaultNS: "common" },
  resources,
);

setLanguage("es");
console.log(t("hello"));
