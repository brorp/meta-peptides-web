import AboutPageComponent from "@/components/about";
import { Metadata } from "next";

export const metadata: Metadata = {
  // Title yang menonjolkan kredibilitas
  title: "About MetaPeptides | Our Mission & Scientific Standards",
  description:
    "Discover the science behind MetaPeptides. Learn about our ISO 9001:2015 certified laboratory, our commitment to ≥99% purity, and the expert team driving global research.",

  openGraph: {
    title: "The Gold Standard in Research Peptides - About MetaPeptides",
    description:
      "Empowering global research with precision-engineered synthetic compounds and radical transparency.",
    url: "http://localhost:3000//about",
    siteName: "MetaPeptides",
    images: [
      {
        url: "/about-og.png",
        width: 1200,
        height: 630,
        alt: "Inside MetaPeptides Laboratory",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Who is MetaPeptides? | Scientific Excellence",
    description:
      "Learn about our commitment to lab-grade purity and scientific integrity.",
    images: ["/about-og.png"],
  },

  keywords: [
    "clinical grade",
    "research purpose",
    "better life",
    "evolving",
    "bio tech",
    "About MetaPeptides",
    "ISO 9001:2015 Research Lab",
    "Peptide Quality Control",
    "Scientific Research Support",
    "MetaPeptides Team",
    "High-Purity Lab Standards",
  ],

  alternates: {
    canonical: "http://localhost:3000//about",
  },
};

export default function AboutPage() {
  return <AboutPageComponent />;
}
