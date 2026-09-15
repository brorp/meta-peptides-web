import { LayoutClient } from "@/components/layout-client";
import localFont from "next/font/local";

const urbancat = localFont({
  src: "../fonts/urbancat-rg.otf",
  display: "swap",
  weight: "400",
  style: "normal",
  adjustFontFallback: false,
});

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LayoutClient storefrontFontClassName={urbancat.className}>
      {children}
    </LayoutClient>
  );
}
