export const MAX_PRODUCT_IMAGES = 10;

const normalizeImageUrl = (value: unknown) => {
  const url = String(value || "").trim();
  if (!url) return null;

  if (url.startsWith("/") && !url.startsWith("//")) return url;

  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? url : null;
  } catch {
    return null;
  }
};

export const normalizeProductImages = (
  imageUrls: unknown,
  legacyImageUrl?: unknown,
) => {
  const candidates = Array.isArray(imageUrls) ? imageUrls : [];
  const normalized = [...candidates, legacyImageUrl]
    .map(normalizeImageUrl)
    .filter((url): url is string => Boolean(url));

  return Array.from(new Set(normalized)).slice(0, MAX_PRODUCT_IMAGES);
};
