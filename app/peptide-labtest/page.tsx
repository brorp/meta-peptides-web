import PeptideLabTestComponent from "@/components/peptide-labtest";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lab Test Results & COA | MetaPeptides Indonesia",
  description:
    "Explore our rigorous laboratory testing protocols and view Certificate of Analysis (COA) for our research peptides. High-purity standards verified by third-party testing.",
  openGraph: {
    title: "MetaPeptides - Third-Party Lab Verifications",
    description:
      "Verified purity and authenticity of research metapeptides. View our latest HPLC and Mass Spec results.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/peptide-labtest`,
    siteName: "MetaPeptides",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 800,
        alt: "MetaPeptides Lab Testing",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MetaPeptides | Lab Test Reports",
    description: "Transparency in research: View our peptide purity reports.",
    images: ["/logo.png"],
  },
};

export default function LabTestPage() {
  return <PeptideLabTestComponent />;
}
