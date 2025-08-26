"use client";

import { Button, Languages } from "@hikai/ui";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
	const router = useRouter();
	const pathname = usePathname();
	const locale = useLocale();

	const toggleLanguage = () => {
		const newLocale = locale === "en" ? "es" : "en";
		router.push(pathname, { locale: newLocale });
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleLanguage}
			aria-label={`Switch to ${locale === "en" ? "Spanish" : "English"}`}
			className="h-9 w-9"
		>
			<Languages className="h-4 w-4" />
		</Button>
	);
}