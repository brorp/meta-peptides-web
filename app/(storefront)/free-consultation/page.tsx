import type { Metadata } from "next";
import { FreeConsultationForm } from "@/components/free-consultation-form";

export const metadata: Metadata = {
  title: "Free Consultation | MetaPeptides",
  description:
    "Tell us your goals and receive a personalized MetaPeptides consultation through WhatsApp.",
  openGraph: {
    title: "Start Your Free MetaPeptides Consultation",
    description:
      "Complete a short form and continue directly to WhatsApp with our consultation team.",
    url: "/free-consultation",
    images: ["/logo.webp"],
  },
};

export default function FreeConsultationPage() {
  return <FreeConsultationForm />;
}
