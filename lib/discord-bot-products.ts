import { supabaseAdmin } from "@/lib/supabase-server";
import { UUID_PATTERN } from "@/lib/discord-bot-data";
import {
  getProductDisplayName,
  matchProduct,
  matchProductVisibleFirst,
} from "@/lib/discord-bot-product-match";

export { getProductDisplayName } from "@/lib/discord-bot-product-match";

export type BotProduct = {
  id: string;
  name: string;
  label: string | null;
  volume: string | null;
  slug: string | null;
  price: number;
  stock: number;
  usage_days: number;
  product_type: "mainproduct" | "misc";
  inventory_type: string;
  category: string | null;
  is_active: boolean;
};

export const BOT_PRODUCT_SELECT =
  "id, name, label, volume, slug, price, stock, usage_days, product_type, inventory_type, category, is_active";

export class ProductMatchError extends Error {
  candidates: string[];

  constructor(message: string, candidates: string[] = []) {
    super(message);
    this.name = "ProductMatchError";
    this.candidates = candidates;
  }
}

export async function loadBotProducts(
  options: { includeInactive?: boolean; includeInventoryRows?: boolean } = {},
) {
  let query = supabaseAdmin
    .from("products")
    .select(BOT_PRODUCT_SELECT);

  // Customer-facing commands must not resolve internal packaging rows.
  // !product and !updateproduct opt in so those rows can be checked and edited.
  if (!options.includeInventoryRows) query = query.eq("inventory_type", "product");

  if (!options.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw new ProductMatchError("Gagal memuat daftar produk");
  return (data || []) as BotProduct[];
}

// Resolves free text such as "reta 10 mg" to one product. Throws with a list
// of candidates when the text is ambiguous or matches nothing.
// visibleFirst (!invoice): hidden products are matched only when no visible
// product fits (see matchProductVisibleFirst).
export async function resolveProductQuery(
  rawQuery: string,
  options: {
    includeInactive?: boolean;
    includeInventoryRows?: boolean;
    products?: BotProduct[];
    visibleFirst?: boolean;
  } = {},
) {
  const query = String(rawQuery || "").trim();
  if (!query) throw new ProductMatchError("Nama produk wajib diisi");

  if (UUID_PATTERN.test(query)) {
    let byId = supabaseAdmin
      .from("products")
      .select(BOT_PRODUCT_SELECT)
      .eq("id", query);
    if (!options.includeInventoryRows) {
      byId = byId.eq("inventory_type", "product");
    }
    if (!options.includeInactive) byId = byId.eq("is_active", true);
    const { data, error } = await byId.maybeSingle();
    if (error) throw new ProductMatchError("Gagal memuat produk");
    if (!data) throw new ProductMatchError("Produk tidak ditemukan");
    return data as BotProduct;
  }

  const products = options.products || (await loadBotProducts(options));
  const result = options.visibleFirst
    ? matchProductVisibleFirst(query, products)
    : matchProduct(query, products);

  if (result.status === "matched") return result.product;
  if (result.status === "ambiguous") {
    throw new ProductMatchError(
      `Produk "${query}" cocok ke lebih dari satu produk. Tulis lebih spesifik (contoh: tambahkan ukuran).`,
      result.candidates.map(getProductDisplayName),
    );
  }

  throw new ProductMatchError(
    `Produk "${query}" tidak ditemukan${options.includeInactive ? "" : " atau tidak aktif"}.`,
    result.suggestions.map(getProductDisplayName),
  );
}
