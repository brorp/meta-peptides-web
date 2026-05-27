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
    const salesDiff =
      (quantityByProductId.get(right.id) || 0) -
      (quantityByProductId.get(left.id) || 0);

    if (salesDiff !== 0) return salesDiff;

    return (
      new Date(right.created_at || 0).getTime() -
      new Date(left.created_at || 0).getTime()
    );
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

      if (error) return errorResponse(error.message, 400);

      // Pakai successResponse biasa, jangan paginateResponse karena datanya array utuh
      return successResponse(data, "All products retrieved for sitemap");
    }

    // --- LOGIKA PAGINATION (UNTUK FRONTEND) ---
    const currentPage = Math.max(1, page);
    const from = (currentPage - 1) * limit;
    const to = from + limit - 1;
    let products: any[] = [];
    let count = 0;

    if (sort === "popularity") {
      const popularityQuery = applyProductFilters(
        supabaseServer
          .from("products")
          .select(PUBLIC_PRODUCT_SELECT, { count: "exact" }),
        category,
        keyword,
      );

      const { data, error, count: popularityCount } = await popularityQuery.order(
        "created_at",
        { ascending: false },
      );

      if (error) return errorResponse(error.message, 400);

      const rankedProducts = await rankProductsByBestSeller(
        supabaseServer,
        data || [],
      );

      products = rankedProducts.slice(from, to + 1);
      count = popularityCount || 0;
    } else {
      let query = applyProductFilters(
        supabaseServer
          .from("products")
          .select(PUBLIC_PRODUCT_SELECT, { count: "exact" }),
        category,
        keyword,
      );

      switch (sort) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "stock_asc":
          query = query.order("stock", { ascending: true });
          break;
        case "latest":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      const { data, error, count: queryCount } = await query.range(from, to);

      if (error) return errorResponse(error.message, 400);

      products = data || [];
      count = queryCount || 0;
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
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
