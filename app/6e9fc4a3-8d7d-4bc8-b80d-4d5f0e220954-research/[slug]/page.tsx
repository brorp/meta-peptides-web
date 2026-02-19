import ResearchDetailPageComponent from "@/components/research/detail";
import { RESEARCH_POSTS } from "@/contants/research";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>; // Ubah menjadi Promise
};

// --- DYNAMIC METADATA GENERATOR ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; // Unwrapping params dengan await
  const post = RESEARCH_POSTS.find((p) => p.slug === slug);

  if (!post) {
    return { title: "Protocol Not Found" };
  }

  return {
    title: `${post.title} | Technical Research | MetaPeptides`,
    description: post.excerpt,

    openGraph: {
      title: `${post.title} - MetaPeptides Lab Protocol`,
      description: post.excerpt,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/research/${post.slug}`,
      siteName: "MetaPeptides Indonesia",
      images: [
        {
          url: "/research-og.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      locale: "en_US",
      type: "article",
      authors: [post.author],
      publishedTime: post.date,
    },

    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: ["/research-og.png"],
    },

    keywords: [
      post.category,
      "MetaPeptides Research",
      "Peptide Indonesia",
      "Lab Protocol",
      post.title.split(" ").join(", "), // Mengubah judul jadi keyword
    ],

    alternates: {
      canonical: `https://metapeptides.com/research/${post.slug}`,
    },
  };
}

// --- PAGE COMPONENT ---
export default async function ResearchDetailPage({ params }: Props) {
  const { slug } = await params;

  const post = RESEARCH_POSTS.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return <ResearchDetailPageComponent post={post} />;
}
