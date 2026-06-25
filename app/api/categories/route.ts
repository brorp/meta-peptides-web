import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("category")
      .eq("is_active", true)
      .not("category", "is", null);

    if (error) return errorResponse("Failed to load categories", 400);

    const uniqueCategories = new Set<string>();
    data?.forEach((item: any) => {
      if (typeof item.category === "string") {
        item.category.split(",").forEach((c: string) => {
          const trimmed = c.trim();
          if (trimmed) uniqueCategories.add(trimmed);
        });
      }
    });

    return successResponse(
      Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b)),
      "Categories retrieved successfully",
    );
  } catch (err: any) {
    return errorResponse("Failed to load categories", 500);
  }
}
