import ProductDetailComponent from "@/components/shop/detail";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProductBySlug(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/products/${slug}`, {
      next: { revalidate: 3600, tags: [`product-${slug}`] },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error("Failed to fetch product data from internal API");
    }

    const result = await res.json();

    return result.success ? result.data : null;
  } catch (error) {
    console.error("Internal API Fetch Error:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | MetaPeptides",
      description:
        "The requested bio-sample could not be located in our database.",
    };
  }

  const title = `${product.name} (${product.label}) | MetaPeptides Indonesia`;
  const description = `${product.short_desc} Purity: ${product.purity}. CAS: ${product.cas}. Verified laboratory grade sequence.`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/shop/${product.slug}`,
      siteName: "MetaPeptides Indonesia",
      images: [
        {
          url: product.image_url || "/product-og-template.png",
          width: 1200,
          height: 630,
          alt: `${product.name} Laboratory Sample`,
        },
      ],
      locale: "id_ID",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: [product.image_url || "/product-og-template.png"],
    },
    keywords: [
      product.name,
      product.label,
      product.cas,
      "Peptide Indonesia",
      "MetaPeptides",
    ],
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <ProductDetailComponent product={product} />
    </main>
  );
}
