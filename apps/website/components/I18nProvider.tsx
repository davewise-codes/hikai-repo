"use client";

import { ReactNode } from "react";
import { I18nextProvider } from "@hikai/i18n/client";
import { i18n } from "@hikai/i18n"; // tu instancia inicializada en create-i18n.ts

export default function I18nProvider({ children }: { children: ReactNode }) {
	return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
