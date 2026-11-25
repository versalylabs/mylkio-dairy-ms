import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { SiteContentProvider } from "@/components/site/SiteContentProvider";

// Quicksand is the Versaly brand face. It is a variable font (300–700): one file covers every weight.
const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Mylkio — Dairy Farm Management System",
  description: "Smarter Dairy Farming. Made Simple. Mobile-first management for Kenyan dairy farmers.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_KE",
    title: "Mylkio — Smarter dairy farming, made simple",
    description: SITE_TAGLINE,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mylkio — Smarter dairy farming, made simple",
    description: SITE_TAGLINE,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mylkio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available: people with poor eyesight rely on it.
  themeColor: "#345C4A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} scroll-smooth`}>
      <body className="antialiased bg-[#F8F8F3] text-[#26332D] selection:bg-[#A8BFA5]/30 selection:text-[#26332D]">
        <SiteContentProvider>{children}</SiteContentProvider>
      </body>
    </html>
  );
}
