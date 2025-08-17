import { I18nProvider, useTranslation } from "@hikai/i18n/react";
import { loadDictionaries } from "@hikai/i18n";

const resources = {
  en: { common: { hello: "Hello" } },
  es: { common: { hello: "Hola" } },
};

loadDictionaries(
  { fallbackLng: "en", supportedLngs: ["en", "es"], defaultNS: "common" },
  resources,
);

function Demo() {
  const { t } = useTranslation();
  return <h1>{t("hello")}</h1>;
}

export default function App() {
  return (
    <I18nProvider lang="es">
      <Demo />
    </I18nProvider>
  );
}
