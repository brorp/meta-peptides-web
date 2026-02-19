import ContactPageComponent from "@/components/contact";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Support | Technical Lab Assistance | MetaPeptides",
  description:
    "Get in touch with MetaPeptides' technical support team. Contact our lab specialists for HPLC/MS data, bulk order inquiries, or custom synthesis consultation.",

  openGraph: {
    title: "Support Desk - MetaPeptides Scientific Support",
    description:
      "Need technical assistance or laboratory data? Our team of specialists is ready to help with your research inquiries.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
    siteName: "MetaPeptides",
    images: [
      {
        url: "/contact-og.png",
        width: 1200,
        height: 630,
        alt: "MetaPeptides Support Center",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MetaPeptides | Contact Our Research Specialists",
    description:
      "Fast response times for technical lab inquiries and order support.",
    images: ["/contact-og.png"],
  },

  keywords: [
    "clinical grade",
    "research purpose",
    "better life",
    "evolving",
    "bio tech",
    "Contact MetaPeptides",
    "Peptide technical support",
    "Bulk order inquiry",
    "COA request",
    "MetaPeptides customer service",
    "Research lab contact",
  ],

  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
  },
};

export default function ContactPage() {
  return <ContactPageComponent />;
}
