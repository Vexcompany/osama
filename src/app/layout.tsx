import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "OSIS Ngobrol Yuk",
  description:
    "Sampaikan aspirasi, saran, dan kritikmu untuk OSIS secara anonim dan mudah.",
  applicationName: "OSIS Ngobrol Yuk",
  authors: [{ name: "OSIS" }],
  formatDetection: { email: false, address: false, telephone: false },
  // We don't index the form (defense in depth) — the case id is internal
  // and we don't want crawlers to spam submissions.
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
