import { NextRequest } from "next/server";
import {
  errorResponse,
  paginateResponse,
  successResponse,
} from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

const PUBLIC_PRODUCT_SELECT =
  "id, name, label, slug, price, original_price, stock, image_url, category, purity, volume, formula, cas, short_desc, overview, storage_instruction, usage_instruction, dosing, complimentary_product_id, complimentary_quantity, is_active, created_at, updated_at";
const BESTSELLER_ORDER_STATUSES = ["processing", "completed"];

const normalizeProductText = (value?: string | null) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const isBacWaterProduct = (product: { name?: string; label?: string | null }) => {
  const name = normalizeProductText(product.name);
  const label = normalizeProductText(product.label);

  return (
    name.includes("bac water") ||
    name.includes("bacwater") ||
    name.includes("bacteriostatic water") ||
    label.includes("bac water") ||
    label.includes("bacwater") ||
    label.startsWith("bacw")
  );
};

const getAvailabilityRank = (product: { stock?: number | string | null }) =>
  Number(product.stock || 0) <= 0 ? 1 : 0;

const compareAvailability = (left: any, right: any) =>
  getAvailabilityRank(left) - getAvailabilityRank(right);

const compareNewest = (left: any, right: any) =>
  new Date(right.created_at || 0).getTime() -
  new Date(left.created_at || 0).getTime();

const applyProductFilters = (
  query: any,
  category?: string | null,
  keyword?: string | null,
) => {
  let nextQuery = query.eq("is_active", true);

  if (category) {
    nextQuery = nextQuery.ilike("category", `%${category}%`);
  }

  if (keyword) {
    nextQuery = nextQuery.or(
      `name.ilike.%${keyword}%,label.ilike.%${keyword}%,short_desc.ilike.%${keyword}%`,
    );
  }

  return nextQuery;
};

const rankProductsByBestSeller = async (
  supabaseServer: any,
  products: any[],
) => {
  if (!products.length) return products;

  const productIds = products.map((product) => product.id);
  const productIdSet = new Set(productIds);

  const { data: paidOrders, error } = await supabaseServer
    .from("orders")
    .select("order_items(product_id, quantity, price_at_purchase)")
    .in("status", BESTSELLER_ORDER_STATUSES);

  if (error) {
    throw new Error(error.message);
  }

  const quantityByProductId = new Map<string, number>();

  for (const order of paidOrders || []) {
    for (const item of (order as any).order_items || []) {
      const productId = String(item.product_id || "");
      if (!productIdSet.has(productId)) continue;
      if (Number(item.price_at_purchase || 0) <= 0) continue;

      quantityByProductId.set(
        productId,
        (quantityByProductId.get(productId) || 0) + Number(item.quantity || 0),
      );
    }
  }

  return [...products].sort((left, right) => {
    const availabilityDiff = compareAvailability(left, right);
    if (availabilityDiff !== 0) return availabilityDiff;

    const bacWaterDiff =
      Number(isBacWaterProduct(left)) - Number(isBacWaterProduct(right));
    if (bacWaterDiff !== 0) return bacWaterDiff;

    const salesDiff =
      (quantityByProductId.get(right.id) || 0) -
      (quantityByProductId.get(left.id) || 0);

    if (salesDiff !== 0) return salesDiff;

    return compareNewest(left, right);
  });
};

const sortProducts = (products: any[], sort: string) => {
  return [...products].sort((left, right) => {
    const availabilityDiff = compareAvailability(left, right);
    if (availabilityDiff !== 0) return availabilityDiff;

    switch (sort) {
      case "price_asc": {
        const priceDiff = Number(left.price || 0) - Number(right.price || 0);
        if (priceDiff !== 0) return priceDiff;
        break;
      }
      case "price_desc": {
        const priceDiff = Number(right.price || 0) - Number(left.price || 0);
        if (priceDiff !== 0) return priceDiff;
        break;
      }
      case "stock_asc": {
        const stockDiff = Number(left.stock || 0) - Number(right.stock || 0);
        if (stockDiff !== 0) return stockDiff;
        break;
      }
      case "latest":
      default:
        break;
    }

    return compareNewest(left, right);
  });
};

const enrichComplimentaryProducts = async (
  supabaseServer: any,
  products: any[],
) => {
  const complimentaryProductIds = Array.from(
    new Set(
      products
        .map((product: any) => product.complimentary_product_id)
        .filter(Boolean),
    ),
  );

  let complimentaryProductMap = new Map<string, { name: string; slug: string }>();
  if (complimentaryProductIds.length > 0) {
    const { data: complimentaryProducts, error: complimentaryError } =
      await supabaseServer
        .from("products")
        .select("id, name, slug")
        .in("id", complimentaryProductIds);

    if (complimentaryError) {
      throw new Error(complimentaryError.message);
    }

    complimentaryProductMap = new Map(
      (complimentaryProducts || []).map((product: any) => [
        product.id,
        {
          name: product.name || "Complimentary Item",
          slug: product.slug || "",
        },
      ]),
    );
  }

  return products.map((product: any) => {
    const complimentaryProduct = product.complimentary_product_id
      ? complimentaryProductMap.get(product.complimentary_product_id)
      : null;

    return {
      ...product,
      complimentary_product_name: complimentaryProduct?.name || null,
      complimentary_product_slug: complimentaryProduct?.slug || null,
      complimentary_quantity: Number(product.complimentary_quantity || 1),
    };
  });
};

export async function GET(req: NextRequest) {
  try {
    const supabaseServer = await createClientCookies();
    const { searchParams } = new URL(req.url);

    // --- PARAMETERS ---
    const getAll = searchParams.get("all") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const keyword = searchParams.get("keyword");
    const sort = searchParams.get("sort") || "latest";

    if (getAll) {
      const { data, error } = await supabaseServer
        .from("products")
        .select("slug, updated_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) return errorResponse("Failed to load products", 400);

      // Pakai successResponse biasa, jangan paginateResponse karena datanya array utuh
      return successResponse(data, "All products retrieved for sitemap");
    }

    // --- LOGIKA PAGINATION (UNTUK FRONTEND) ---
    const currentPage = Math.max(1, page);
    const from = (currentPage - 1) * limit;
    const to = from + limit - 1;
    let products: any[] = [];
    let count = 0;

    const productsQuery = applyProductFilters(
      supabaseServer
        .from("products")
        .select(PUBLIC_PRODUCT_SELECT, { count: "exact" }),
      category,
      keyword,
    );

    const { data, error, count: productsCount } = await productsQuery.order(
      "created_at",
      { ascending: false },
    );

    if (error) return errorResponse("Failed to load products", 400);

    if (sort === "popularity") {
      const rankedProducts = await rankProductsByBestSeller(
        supabaseServer,
        data || [],
      );
      products = rankedProducts.slice(from, to + 1);
      count = productsCount || 0;
    } else {
      products = sortProducts(data || [], sort).slice(from, to + 1);
      count = productsCount || 0;
    }

    const enrichedProducts = await enrichComplimentaryProducts(
      supabaseServer,
      products,
    );

    return paginateResponse(
      enrichedProducts,
      currentPage,
      limit,
      count,
      "Products retrieved successfully",
    );
  } catch (err: any) {
    return errorResponse("Failed to load products", 500);
  }
}
