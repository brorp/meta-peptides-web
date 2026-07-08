import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "sonner";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  themeColor: "#414042",
  width: "device-width",
  initialScale: 1,
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meta-peptides.com";

export const metadata: Metadata = {
  title: {
    default: "MetaPeptides | Premium Research Peptides",
    template: "%s | MetaPeptides",
  },
  description:
    "Indonesia's leading supplier of high-purity research peptides. Verified laboratory compounds with ≥99% purity standards for scientific advancement.",
  metadataBase: new URL(baseUrl),

  keywords: [
    "Research Peptides",
    "Buy Peptides",
    "MetaPeptides",
    "Peptide Purity",
    "Laboratory Compounds",
  ],

  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.webp",
    apple: "/logo.webp",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "MetaPeptides",
    title: "MetaPeptides | Premium Research Peptides",
    description:
      "Your trusted source for high-purity laboratory research compounds.",
    images: [
      {
        url: "/logo.webp",
        width: 1200,
        height: 630,
        alt: "MetaPeptides Branding",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "MetaPeptides",
    description: "Verified Research Peptides for Scientific Advancement.",
    images: ["/logo.webp"],
    creator: "@metapeptides",
  },

  verification: {
    google: "HKWvqqH9NuGYEAS1NZgBEqAl-Xzdh305cxItDWvo0rY",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Meta Peptides",
        publisher: { "@id": `${baseUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: "Meta Peptides",
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/logo.webp`,
        },
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "support@meta-peptides.com",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
