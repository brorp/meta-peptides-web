import AuthPageComponent from "@/components/auth";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MetaPeptides",
  description: "Secure login for registered",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AuthPageComponent />;
}
