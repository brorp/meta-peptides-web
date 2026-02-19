import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "@/components/layout-client";
import Providers from "./providers";
import { Toaster } from "sonner";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  themeColor: "#0F172A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "MetaPeptides | Premium Research Peptides",
    template: "%s | MetaPeptides",
  },
  description:
    "High-purity research peptides verified for laboratory excellence. Providing scientific compounds with ≥99% purity standards.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),

  keywords: [
    "Research Peptides",
    "Buy Peptides",
    "Laboratory Compounds",
    "Peptide Purity",
    "MetaPeptides",
  ],

  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    siteName: "MetaPeptides",
    title: "MetaPeptides | Premium Research Peptides",
    description:
      "Your trusted source for high-purity laboratory research compounds.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MetaPeptides Branding",
      },
    ],
  },

  twitter: {
    card: "summary",
    title: "MetaPeptides",
    description: "Verified Research Peptides for Scientific Advancement.",
    images: ["/logo.png"],
    creator: "@metapeptides",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <Providers>
          <LayoutClient>{children}</LayoutClient>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
