"use client";

import { ReactNode, useEffect } from "react";
import { I18nextProvider } from "@hikai/i18n/client";
import { i18n, setLanguage as syncLanguage } from "@hikai/i18n"; // tu instancia inicializada en create-i18n.ts

export default function I18nProvider({
        lang,
        children,
}: {
        lang: string;
        children: ReactNode;
}) {
        useEffect(() => {
                syncLanguage(lang);
        }, [lang]);

        return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
