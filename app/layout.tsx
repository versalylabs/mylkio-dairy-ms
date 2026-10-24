import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "300", "400", "500", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Mylkio — Dairy Farm Management System",
  description: "Smarter Dairy Farming. Made Simple. Mobile-first management for Kenyan dairy farmers.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mylkio",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#48563A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased bg-[#F7F4EA] text-[#2D3327] selection:bg-[#dbe3d3] selection:text-[#2D3327]">
        {children}
      </body>
    </html>
  );
}
