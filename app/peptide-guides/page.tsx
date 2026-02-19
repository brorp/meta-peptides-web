import PeptidesGuidesComponent from "@/components/peptides-guides";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Protocol & Guides | MetaPeptides Indonesia",
  description:
    "Master the technical protocols for peptide reconstitution, storage, and laboratory handling. Professional guides for research integrity.",
  openGraph: {
    title: "MetaPeptides - Research Protocol Guides",
    description:
      "Technical SOPs for peptide research metapeptides in Indonesia.",
    url: "https://metapeptides.com/peptides-guides",
    siteName: "MetaPeptides",
    images: [
      { url: "/logo.png", width: 800, height: 800, alt: "Peptide Guides" },
    ],
    type: "website",
  },
};

export default function PeptidesGuidesPage() {
  return <PeptidesGuidesComponent />;
}
