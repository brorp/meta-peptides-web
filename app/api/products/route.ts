import { NextRequest } from "next/server";
import { errorResponse, paginateResponse } from "@/lib/api-response";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const keyword = searchParams.get("keyword");
    const sort = searchParams.get("sort") || "latest";

    const currentPage = Math.max(1, page);
    const from = (currentPage - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseServer.from("products").select("*", { count: "exact" });

    // --- FILTERING ---
    if (category) {
      query = query.eq("category", category);
    }

    if (keyword) {
      query = query.or(
        `name.ilike.%${keyword}%,label.ilike.%${keyword}%,short_desc.ilike.%${keyword}%`,
      );
    }

    // --- SORTING LOGIC ---
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
      case "latest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      return errorResponse(error.message, 400);
    }

    return paginateResponse(
      data,
      currentPage,
      limit,
      count || 0,
      "Products retrieved successfully",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
