import type { Metadata, Viewport } from "next";

import "./globals.css";

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
  themeColor: "#06222e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
