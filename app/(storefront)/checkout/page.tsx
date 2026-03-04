"use client";

import dynamic from "next/dynamic";

const CheckoutPageComponent = dynamic(() => import("@/components/checkout"), {
  ssr: false,
});

export default function CheckoutClient() {
  return <CheckoutPageComponent />;
}
