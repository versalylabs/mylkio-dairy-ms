import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  // Inter is a variable font: one file covers every weight, so no weight list.
  variable: "--font-sans",
});

// An editorial serif for headlines; Inter stays for everything people read and tap.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Mylkio — Dairy Farm Management System",
  description: "Smarter Dairy Farming. Made Simple. Mobile-first management for Kenyan dairy farmers.",
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
    <html lang="en" className={`${inter.variable} ${fraunces.variable} scroll-smooth`}>
      <body className="antialiased bg-[#FAF9F5] text-[#26332D] selection:bg-[#A8BFA5]/30 selection:text-[#26332D]">
        {children}
      </body>
    </html>
  );
}
