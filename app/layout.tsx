import type { Metadata, Viewport } from "next"; // Tambahkan Viewport
import { Geist } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "@/components/layout-client";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Konfigurasi Viewport untuk kontrol tema di browser mobile
export const viewport: Viewport = {
  themeColor: "#0F172A", // Warna bar browser (disesuaikan dengan warna primary kita)
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // Title template agar setiap halaman otomatis punya akhiran "| MetaPeptides"
  title: {
    default: "MetaPeptides | Premium Research Peptides",
    template: "%s | MetaPeptides",
  },
  description:
    "High-purity research peptides verified for laboratory excellence. Providing scientific compounds with ≥99% purity standards.",
  metadataBase: new URL("http://localhost:3000"),

  // Keywords global
  keywords: [
    "Research Peptides",
    "Buy Peptides",
    "Laboratory Compounds",
    "Peptide Purity",
    "MetaPeptides",
  ],

  // Favicon & Icons
  icons: {
    icon: "/favicon.ico", // Standar favicon
    shortcut: "/logo.png",
    apple: "/logo.png", // Icon saat di-save di iPhone
  },

  // OpenGraph (SEO untuk Facebook, WhatsApp, dll)
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
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

  // Twitter (SEO untuk X/Twitter)
  twitter: {
    card: "summary",
    title: "MetaPeptides",
    description: "Verified Research Peptides for Scientific Advancement.",
    images: ["/logo.png"],
    creator: "@metapeptides", // Ganti dengan username twitter jika ada
  },

  // Robot crawling
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
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
