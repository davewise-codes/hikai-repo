import { useSyncExternalStore } from "react";
import { getTranslation, i18n } from "../core";

// Hook to access the translation function and current language.
export function useTranslation() {
  const lang = useSyncExternalStore(
    (callback) => {
      i18n.on("languageChanged", callback);
      return () => i18n.off("languageChanged", callback);
    },
    () => i18n.language,
    () => i18n.language,
  );

  return { t: getTranslation, lang };
}
