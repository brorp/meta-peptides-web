import { LayoutClient } from "@/components/layout-client";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutClient>{children}</LayoutClient>;
}
