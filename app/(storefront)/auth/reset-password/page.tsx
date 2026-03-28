import ResetPasswordPageComponent from "@/components/auth/reset-password";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | MetaPeptides",
  description: "Secure password reset for registered MetaPeptides users.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResetPasswordPageComponent />;
}
