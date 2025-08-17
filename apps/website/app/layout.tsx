import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Hikai — Stand Out",
	description: "SEO content manager powered by AI agents.",
	metadataBase: new URL("https://hikai.pro"),
};

export default function RootLayout({
        children,
        params,
}: {
        children: React.ReactNode;
        params: { lang?: string };
}) {
        return (
                <html lang={params.lang ?? "en"}>
                        {/* fallback; ver i18n en [lang]/layout.tsx */}
                        <body
                                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                        >
                                {children}
                        </body>
                </html>
        );
}
