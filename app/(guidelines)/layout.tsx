import type { Metadata } from "next";
import "@/app/globals.css";

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
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-white text-slate-900 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
