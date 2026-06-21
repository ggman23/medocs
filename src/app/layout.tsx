import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Next prefixes _next assets and the manifest with basePath, but not the icon
// hrefs, so we prefix those ourselves.
const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Médocs — Suivi de mes traitements",
  description:
    "Suivi du stock de mes médicaments, insuline et capteurs de glycémie, avec alertes de réapprovisionnement.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Médocs" },
  icons: {
    icon: `${bp}/icons/icon.svg`,
    apple: `${bp}/icons/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
