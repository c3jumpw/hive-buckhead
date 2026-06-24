// src/app/layout.tsx
// Root layout — renders on every page. Sets fonts, dark mode base, providers.

import type { Metadata, Viewport } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/layout/providers";
import "@/styles/globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hive Buckhead",
    template: "%s | Hive Buckhead",
  },
  description: "Reservation management system for Hive Buckhead",
  robots: { index: false, follow: false }, // private staff app
};

export const viewport: Viewport = {
  themeColor: "#0E0C0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // prevent zoom on mobile forms
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${cormorant.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-hive-bg font-sans text-foreground antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
