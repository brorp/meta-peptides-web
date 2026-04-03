import GuidelinesEbookViewer from "@/components/guidelines/ebook-viewer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peptides Guide | MetaPeptides",
  description:
    "Panduan lengkap cara reconstitution, dosing, aplikasi, dan penyimpanan research peptides — langkah demi langkah dalam Bahasa Indonesia.",
  openGraph: {
    title: "Peptides Guide — MetaPeptides",
    description:
      "Panduan interaktif penggunaan research peptides dari MetaPeptides.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/guidelines`,
    siteName: "MetaPeptides",
    images: [{ url: "/logo.webp", width: 800, height: 800 }],
    type: "website",
  },
};

export default function GuidelinesPage() {
  return <GuidelinesEbookViewer />;
}
