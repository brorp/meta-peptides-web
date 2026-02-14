import ShopPageComponent from "@/components/shope";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Research Peptides | Verified ≥99% Purity | MetaPeptides",
  description:
    "Browse our catalog of high-purity research peptides. Each batch is third-party tested via HPLC & MS. Secure shipping for laboratory research worldwide.",

  openGraph: {
    title: "MetaPeptides Virtual Catalog - Premium Research Compounds",
    description:
      "Explore our collection of clinical-grade peptides. Tested for precision, delivered with speed.",
    url: "http://localhost:3000//shop",
    siteName: "MetaPeptides",
    images: [
      {
        url: "/shop-banner.png",
        width: 1200,
        height: 630,
        alt: "MetaPeptides Product Catalog",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Shop High-Purity Research Peptides",
    description: "Verified purity, lab-tested compounds.",
    images: ["/shop-banner.png"],
  },

  keywords: [
    "clinical grade",
    "research purpose",
    "better life",
    "evolving",
    "bio tech",
    "Buy research peptides",
    "HPLC tested peptides",
    "MetaPeptides catalog",
    "High purity peptides",
    "Laboratory research compounds",
    "Peptides for sale",
  ],
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function ShopPage() {
  return <ShopPageComponent />;
}
