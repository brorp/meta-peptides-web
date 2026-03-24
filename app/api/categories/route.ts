import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { createClientCookies } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const supabaseServer = await createClientCookies();
    // Only select the category field
    const { data, error } = await supabaseServer
      .from("products")
      .select("category")
      .eq("is_active", true);

    if (error) return errorResponse(error.message, 400);

    const uniqueCategories = new Set<string>();
    data?.forEach((item: any) => {
      if (item.category) {
        item.category.split(',').forEach((c: string) => {
          const trimmed = c.trim();
          if (trimmed) uniqueCategories.add(trimmed);
        });
      }
    });

    return successResponse(Array.from(uniqueCategories).sort(), "Categories retrieved successfully");
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
