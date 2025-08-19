import { setLanguage } from "../core";

// Changes the language synchronously. Designed for SSR/SSG where
// side effects like useEffect are not available.
export function syncLanguage(lang: string) {
  setLanguage(lang);
}
