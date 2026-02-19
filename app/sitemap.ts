import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/products?all=true`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const resJson = await response.json();

    const products = resJson.data || [];

    const productUrls = products.map((product: any) => ({
      url: `${baseUrl}/shop/${product.slug}`,
      lastModified: new Date(product.updated_at || new Date()),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const staticRoutes = [
      "",
      "/shop",
      "/about",
      "/faq",
      "/peptide-guides",
      "/peptide-labtest",
    ].map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: route === "" ? 1.0 : 0.6,
    }));

    return [...staticRoutes, ...productUrls];
  } catch (error) {
    return [
      { url: baseUrl, lastModified: new Date() },
      { url: `${baseUrl}/shop`, lastModified: new Date() },
    ];
  }
}
