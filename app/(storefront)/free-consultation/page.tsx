import type { Metadata } from "next";
import Script from "next/script";
import { FreeConsultationForm } from "@/components/free-consultation-form";

const META_PIXEL_ID = "4563926690560508";

export const metadata: Metadata = {
  title: "Free Consultation | MetaPeptides",
  description:
    "Pick your goal and continue",
  openGraph: {
    title: "Start Your Free MetaPeptides Consultation",
    description:
      "Choose your wellness goal and continue directly to WhatsApp with our consultation team.",
    url: "/free-consultation",
    images: ["/logo.webp"],
  },
};

export default function FreeConsultationPage() {
  return (
    <>
      <Script id="meta-pixel-free-consultation" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <FreeConsultationForm />
    </>
  );
}
