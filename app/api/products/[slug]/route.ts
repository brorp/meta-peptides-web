import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabaseServer = await createClientCookies();
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return errorResponse("Product identifier is required", 400);
    }

    const { data, error } = await supabaseServer
      .from("products")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116" || !data) {
        return errorResponse("Bio-sample not found in database", 404);
      }
      return errorResponse(error?.message || "Unknown error", 400);
    }

    let complimentaryProductName: string | null = null;
    let complimentaryProductSlug: string | null = null;

    if (data.complimentary_product_id) {
      const { data: complimentaryProduct } = await supabaseServer
        .from("products")
        .select("name, slug")
        .eq("id", data.complimentary_product_id)
        .maybeSingle();

      complimentaryProductName = complimentaryProduct?.name || null;
      complimentaryProductSlug = complimentaryProduct?.slug || null;
    }

    return successResponse(
      {
        ...data,
        complimentary_product_name: complimentaryProductName,
        complimentary_product_slug: complimentaryProductSlug,
        complimentary_quantity: Number(data.complimentary_quantity || 1),
      },
      "Product details retrieved",
    );
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
