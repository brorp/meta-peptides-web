import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peptides Guide | MetaPeptides",
  description:
    "Panduan lengkap cara penggunaan, reconstitution, dosing, aplikasi, dan penyimpanan research peptides dalam Bahasa Indonesia.",
};

export default function GuidelinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
