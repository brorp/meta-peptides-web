import ShippingPolicyPage from "@/components/shipping-policy";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy | MetaPeptides - Indonesia's Research Support",
  description:
    "Review the Meta Peptides shipping terms, including our strict no-refund policy, Indonesia-only shipping coverage, and dispatch schedules.",
  openGraph: {
    title: "MetaPeptides Shipping Policy",
    description:
      "Binding shipping terms and delivery information for research materials.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/shipping`, // Pastikan mengarah ke /shipping
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
    title: "MetaPeptides Shipping Policy",
    description:
      "Strict shipping terms for research materials within Indonesia.",
    images: ["/logo.webp"],
  },
};

export default function ShippingPage() {
  return <ShippingPolicyPage />;
}
