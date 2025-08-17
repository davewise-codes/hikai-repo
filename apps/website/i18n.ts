import { getRequestConfig, requestLocale } from "next-intl/server";

export default getRequestConfig(async () => {
	const locale = await requestLocale();

	return {
		messages: (await import(`./messages/${locale}.json`)).default,
	};
});

export const locales = ["en", "es"];
export const defaultLocale = "en";
