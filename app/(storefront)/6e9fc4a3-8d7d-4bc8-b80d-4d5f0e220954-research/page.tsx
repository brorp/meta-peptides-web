import ResearchPageComponent from "@/components/research";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Research Index | Scientific Publications & Media | MetaPeptides",
  description:
    "Explore MetaPeptides' research archives. Access the latest peptide studies, synthesis blogs, and educational laboratory content via our TikTok and Reels integration.",

  openGraph: {
    title: "Research Hub - MetaPeptides Indonesia",
    description:
      "Bridging the gap between theory and laboratory practice. Stay updated with our latest scientific blogs and video demonstrations.",
    url: "https://metapeptides.com/research", // Update dari localhost ke domain asli nanti
    siteName: "MetaPeptides",
    images: [{ url: "/research-og.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "article",
  },
  keywords: [
    "Peptide research Indonesia",
    "Synthesis blogs",
    "Laboratory protocols",
    "Bio-tech education",
    "MetaPeptides research hub",
    "HPLC analysis data",
  ],
};

export default function ResearchPage() {
  return <ResearchPageComponent />;
}
