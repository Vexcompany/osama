import type { Metadata, Viewport } from "next";

import { Sora, Inter } from "next/font/google";

import "./globals.css";

const display = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OSIS Ngobrol Yuk",
  description: "Sampaikan aspirasimu untuk OSIS. Anonim dan mudah.",
  applicationName: "OSIS Ngobrol Yuk",
  authors: [{ name: "OSIS" }],
  formatDetection: { email: false, address: false, telephone: false },
  // We don't index the form (defense in depth) — case ids are now
  // user-visible so we definitely don't want crawlers indexing them.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#040507",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
      </body>
    </html>
  );
}
