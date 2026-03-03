"use client";

import { useState } from "react";
import { AgeVerificationModal } from "./age-verification-modal";
import { PromoModal } from "./promo-modal";

export default function OneModal() {
  const [showPromo, setShowPromo] = useState(false);

  const handleDisclaimerVerified = () => {
    const hasSeenPromo = localStorage.getItem("metapeptides_promo_first_visit");

    if (!hasSeenPromo) {
      setTimeout(() => {
        setShowPromo(true);
      }, 600);
    }
  };

  return (
    <>
      <AgeVerificationModal onVerified={handleDisclaimerVerified} />
      <PromoModal open={showPromo} onOpenChange={setShowPromo} />
    </>
  );
}
