import FAQPageComponent from "@/components/faq";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | MetaPeptides - Research Support & Lab Protocols",
  description:
    "Find answers to frequently asked questions about our premium research peptides, purity standards, and shipping policies.",
  openGraph: {
    title: "MetaPeptides Support Center",
    description: "Expert answers to your research peptide inquiries.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/faq`,
    siteName: "MetaPeptides",
    images: [
      {
        url: "/logo.webp",
        width: 800,
        height: 800,
        alt: "MetaPeptides Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "MetaPeptides FAQ",
    description: "Scientific support for research peptides.",
    images: ["/logo.webp"],
  },
};

export default function FAQPage() {
  return <FAQPageComponent />;
}
