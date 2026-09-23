import type { Metadata } from "next";
import localFont from "next/font/local";

const urbancat = localFont({
  src: "../fonts/urbancat-rg.otf",
  display: "swap",
  weight: "400",
  style: "normal",
  adjustFontFallback: false,
});

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
  return <div className={urbancat.className}>{children}</div>;
}
