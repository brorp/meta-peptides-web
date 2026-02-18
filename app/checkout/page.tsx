import CheckoutPageComponent from "@/components/checkout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "MetaPeptides",
  description:
    "Checkout securely with MetaPeptides. Review your order, enter shipping details, and complete payment for a seamless purchasing experience.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutPageComponent />;
}
