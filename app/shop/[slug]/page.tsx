import ProductDetailComponent from "@/components/shop/detail";
import { products } from "@/contants/product";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

// --- DYNAMIC METADATA GENERATOR ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);

  if (!product) {
    return { title: "Product Not Found | MetaPeptides" };
  }

  const title = `${product.name} (${product.label}) | MetaPeptides Indonesia`;
  const description = `${product.shortDesc} Purity: ${product.purity}. CAS: ${product.cas}. Verified laboratory grade sequence by MetaPeptides.`;

  return {
    title: title,
    description: description,

    openGraph: {
      title: title,
      description: description,
      url: `http://localhost:3000//shop/${product.slug}`,
      siteName: "MetaPeptides Indonesia",
      images: [
        {
          url: "/product-og-template.png", // Pastikan file ini ada di public folder
          width: 1200,
          height: 630,
          alt: `${product.name} - ${product.label}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: ["/product-og-template.png"],
    },

    keywords: [
      product.name,
      product.label,
      product.cas,
      "Peptide Indonesia",
      "Laboratory Grade Peptides",
      "MetaPeptides Shop",
      "Research Chemicals Indonesia",
    ],

    alternates: {
      canonical: `http://localhost:3000/shop/${product.slug}`,
    },
  };
}

// --- PAGE COMPONENT ---
export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const product = products.find((p) => p.slug === slug);

  if (!product) {
    notFound();
  }

  return <ProductDetailComponent product={product} />;
}
