import { NextRequest } from "next/server";
import {
  errorResponse,
  paginateResponse,
  successResponse,
} from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

const PUBLIC_PRODUCT_SELECT =
  "id, name, label, slug, price, original_price, stock, image_url, category, purity, volume, formula, cas, short_desc, overview, storage_instruction, usage_instruction, dosing, complimentary_product_id, complimentary_quantity, is_active, created_at, updated_at";

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

    let query = supabaseServer
      .from("products")
      .select(PUBLIC_PRODUCT_SELECT, { count: "exact" })
      .eq("is_active", true);

    // --- FILTERING ---
    if (category) {
      query = query.ilike("category", `%${category}%`);
    }

    if (keyword) {
      query = query.or(
        `name.ilike.%${keyword}%,label.ilike.%${keyword}%,short_desc.ilike.%${keyword}%`,
      );
    }

    // --- SORTING ---
    switch (sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "popularity":
        query = query.order("sales_count", { ascending: false });
        break;
      case "stock_asc":
        query = query.order("stock", { ascending: true });
        break;
      case "latest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(from, to);

    if (error) return errorResponse(error.message, 400);

    const products = data || [];
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
        return errorResponse(complimentaryError.message, 400);
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

    const enrichedProducts = products.map((product: any) => {
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

    return paginateResponse(
      enrichedProducts,
      currentPage,
      limit,
      count || 0,
      "Products retrieved successfully",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
