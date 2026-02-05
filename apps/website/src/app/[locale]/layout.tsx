import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { FontProvider } from "@/providers/font-provider";
import { ThemeProvider } from "@/providers/client-theme-provider";
import { WaitlistPopupProvider } from "@/components/waitlist-popup-provider";
import "../globals.css";

export const metadata = {
	icons: {
		icon: [
			{
				url: "/favicon-light.svg",
				media: "(prefers-color-scheme: light)",
			},
			{
				url: "/favicon-dark.svg",
				media: "(prefers-color-scheme: dark)",
			},
		],
	},
};

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
		<html
			lang={locale}
			suppressHydrationWarning
			className="theme-amber-minimal dark"
		>
			<body>
				<ThemeProvider
					defaultTheme="dark"
					storageKey="hikai-theme"
					enableSystem={false}
				>
					<FontProvider>
						<WaitlistPopupProvider>
							<NextIntlClientProvider>{children}</NextIntlClientProvider>
						</WaitlistPopupProvider>
					</FontProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
