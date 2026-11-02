import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  authenticateDiscordBotRequest,
  readDiscordBotJson,
} from "@/lib/discord-bot-auth";
import {
  BOT_PRODUCT_SELECT,
  ProductMatchError,
  getProductDisplayName,
  resolveProductQuery,
} from "@/lib/discord-bot-products";
import { supabaseAdmin } from "@/lib/supabase-server";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  mainproduct: "mainproduct (Peptides)",
  misc: "misc (Perintilan)",
};

function withDisplay(product: any) {
  return {
    ...product,
    display_name: getProductDisplayName(product),
    product_type_label: PRODUCT_TYPE_LABELS[product.product_type] || product.product_type,
  };
}

// "8 weeks", "8 minggu", "56 hari", "56" -> days
function parseUsageLife(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  const text = String(value ?? "").trim().toLowerCase();
  const match = text.match(/^(\d+)\s*(d|day|days|hari|w|week|weeks|minggu|m|month|months|bulan)?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] || "days";
  if (["w", "week", "weeks", "minggu"].includes(unit)) return amount * 7;
  if (["m", "month", "months", "bulan"].includes(unit)) return amount * 30;
  return amount;
}

function normalizeProductType(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_.-]+/g, "");
  if (["main", "mainproduct", "peptide", "peptides"].includes(normalized)) {
    return "mainproduct";
  }
  if (["misc", "perintilan", "accessory", "accessories", "aksesoris"].includes(normalized)) {
    return "misc";
  }
  return null;
}

function productErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ProductMatchError) {
    return errorResponse(error.message, 400, { candidates: error.candidates });
  }
  return errorResponse(fallback, 500);
}

// !product <query>: look up how a short name resolves, plus price/stock.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateDiscordBotRequest(req);
    if (auth.response) return auth.response;

    const query = String(new URL(req.url).searchParams.get("query") || "").trim();
    const product = await resolveProductQuery(query, {
      includeInactive: true,
      includeInventoryRows: true,
    });
    return successResponse(withDisplay(product), "Produk ditemukan");
  } catch (error) {
    return productErrorResponse(error, "Gagal mencari produk");
  }
}

// !updateproduct <query> (any bot channel): price, usage_life, type.
// products.category (storefront tags) is never touched here.
export async function PATCH(req: NextRequest) {
  try {
    const auth = await readDiscordBotJson(req, { maxRequestsPerMinute: 20 });
    if (auth.response) return auth.response;

    const body = auth.body || {};
    const product = await resolveProductQuery(String(body.query ?? ""), {
      includeInactive: true,
      includeInventoryRows: true,
    });
    const updateData: Record<string, unknown> = {};

    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return errorResponse("price harus angka >= 0 (contoh 1750000)", 400);
      }
      updateData.price = price;
    }

    let productType = product.product_type;
    if (body.type !== undefined) {
      const nextType = normalizeProductType(body.type);
      if (!nextType) return errorResponse("type harus mainproduct atau misc", 400);
      productType = nextType;
      updateData.product_type = nextType;
    }

    if (body.usage_life !== undefined) {
      const usageDays = parseUsageLife(body.usage_life);
      if (usageDays === null || usageDays > 3650) {
        return errorResponse(
          "usage_life harus angka hari/minggu/bulan, contoh: 56 hari, 8 minggu, 8 weeks",
          400,
        );
      }
      if (productType === "misc" && usageDays > 0) {
        return errorResponse(
          `${getProductDisplayName(product)} bertipe misc (perintilan) sehingga tidak punya usage_life. Ubah dulu type: mainproduct kalau memang peptide.`,
          400,
        );
      }
      updateData.usage_days = usageDays;
    }

    if (productType === "misc") updateData.usage_days = 0;

    if (!Object.keys(updateData).length) {
      return errorResponse("Isi minimal satu field: price, usage_life, atau type", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", product.id)
      .select(BOT_PRODUCT_SELECT)
      .single();
    if (error || !data) return errorResponse("Gagal mengubah produk", 400);

    return successResponse(
      {
        ...withDisplay(data),
        previous: {
          price: product.price,
          usage_days: product.usage_days,
          product_type: product.product_type,
        },
      },
      "Produk diubah",
    );
  } catch (error) {
    return productErrorResponse(error, "Gagal mengubah produk");
  }
}
