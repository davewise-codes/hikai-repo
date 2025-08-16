import { i18n } from "./create-i18n";

/** Forzar idioma desde el layout por URL, sin React */
export function syncLanguage(lang: string) {
	const supported = ["en", "es"];
	const chosen = supported.includes(lang) ? lang : "en";
	if (i18n.language !== chosen) i18n.changeLanguage(chosen);
}

/** Acceso directo a t en server si lo necesitas */
export const t = i18n.t.bind(i18n);

export { i18n };
