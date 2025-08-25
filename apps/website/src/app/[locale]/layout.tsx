import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { FontProvider } from "@/providers/font-provider";
import { ThemeProvider } from "@/providers/client-theme-provider";
import "../globals.css";

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	// Ensure that the incoming `locale` is valid
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}

	return (
		<html lang={locale} suppressHydrationWarning>
			<body>
				<ThemeProvider
					defaultTheme="system"
					storageKey="hikai-theme"
					enableSystem
				>
					<FontProvider>
						<NextIntlClientProvider>{children}</NextIntlClientProvider>
					</FontProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
