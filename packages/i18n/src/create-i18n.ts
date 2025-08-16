import i18n from "i18next";
import en_common from "./locales/en.json";
import es_common from "./locales/es.json";

const initialized = i18n.isInitialized;

if (!initialized) {
	void i18n.init({
		fallbackLng: "en",
		supportedLngs: ["en", "es"],
		resources: {
			en: { common: en_common },
			es: { common: es_common },
		},
		defaultNS: "common",
		interpolation: { escapeValue: false },
		returnEmptyString: false,
	});
}

export { i18n };
