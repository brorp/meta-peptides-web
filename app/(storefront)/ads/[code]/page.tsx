import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  META_AD_ROUTE_CODES,
  MetaPreviewLandingPage,
  type MetaAdRouteCode,
} from "@/components/ads/meta-preview-landing-page";

type Props = {
  params: Promise<{ code: string }>;
};

function isMetaAdRouteCode(code: string): code is MetaAdRouteCode {
  return META_AD_ROUTE_CODES.includes(code as MetaAdRouteCode);
}

export function generateStaticParams() {
  return META_AD_ROUTE_CODES.map((code) => ({ code }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  if (!isMetaAdRouteCode(code)) {
    return {
      title: "Landing Page Not Found | MetaWellness",
    };
  }

  return {
    title: "Rahasia Transformasi Fisik | MetaWellness",
    description:
      "MetaWellness peptide education landing page for free consultation.",
    alternates: {
      canonical: `/ads/${code}`,
    },
    openGraph: {
      title: "Rahasia Transformasi Fisik | MetaWellness",
      description:
        "Pelajari peptide support dan lanjutkan ke free consultation MetaWellness.",
      url: `/ads/${code}`,
      images: ["/ads/meta-preview-4/result-body.png"],
      type: "website",
    },
  };
}

export default async function MetaAdsLandingRoute({ params }: Props) {
  const { code } = await params;

  if (!isMetaAdRouteCode(code)) {
    notFound();
  }

  return <MetaPreviewLandingPage code={code} />;
}
