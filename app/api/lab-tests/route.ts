import { NextRequest } from "next/server";
import { errorResponse, paginateResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createClientCookies();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase.from("lab_tests").select(
      `
        id,
        product_id,
        purity_level,
        test_date,
        report_url,
        report_images,
        product:products (
          name,
          image_url,
          slug
        )
      `,
      { count: "exact" },
    );
    if (search) {
      query = query.ilike("products.name", `%${search}%`);
    }

    const { data, error, count } = await query
      .order("test_date", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return paginateResponse(
      data,
      page,
      limit,
      count || 0,
      "Products retrieved successfully",
    );
  } catch (err: any) {
    return errorResponse("Failed to load lab tests", 500);
  }
}
