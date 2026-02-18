import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabaseServer = await createClientCookies();
  try {
    // 2. Await params-nya di sini
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return errorResponse("Product identifier is required", 400);
    }

    const { data, error } = await supabaseServer
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116" || !data) {
        return errorResponse("Bio-sample not found in database", 404);
      }
      return errorResponse(error?.message || "Unknown error", 400);
    }

    return successResponse(data, "Product details retrieved");
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
