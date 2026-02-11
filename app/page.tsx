import HomePageComponent from "@/components/home";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MetaPeptides | Premium Research Peptides ≥99% Purity",
  description:
    "MetaPeptides provides high-purity research compounds for laboratory excellence. Verified by third-party HPLC & MS analysis with same-day shipping.",

  openGraph: {
    title: "MetaPeptides - Precision Science for Research",
    description:
      "Order clinical-grade research peptides with verified purity and lightning-fast dispatch.",
    url: "http://localhost:3000/",
    siteName: "MetaPeptides",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "MetaPeptides Laboratory Grade Compounds",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "MetaPeptides | Global Research Support",
    description: "Verified Research Peptides for Scientific Advancement.",
    images: ["/logo.png"],
  },

  keywords: [
    "clinical grade",
    "research purpose",
    "better life",
    "evolving",
    "bio tech",
    "Research Peptides",
    "Buy Peptides Online",
    "HPLC Verified Peptides",
    "MetaPeptides",
    "Laboratory Compounds",
  ],
};

export default function Page() {
  return <HomePageComponent />;
}
