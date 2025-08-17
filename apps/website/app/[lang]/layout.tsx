import type { ReactNode } from "react";
import I18nProvider from "@/components/I18nProvider";
import { setLanguage as syncLanguage } from "@hikai/i18n";

const SUPPORTED_LANGS = ["en", "es"] as const;

export function generateStaticParams() {
        return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default function LangLayout({
        children,
        params,
}: {
        children: ReactNode;
        params: { lang: string };
}) {
        syncLanguage(params.lang);
        return <I18nProvider lang={params.lang}>{children}</I18nProvider>;
}

