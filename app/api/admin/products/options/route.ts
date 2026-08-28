import { errorResponse, successResponse } from "@/lib/api-response";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

const PRODUCT_OPTION_SELECT = "id, name, label, price, stock";

export async function GET() {
  try {
    const role = await getAdminSessionFromCookies();
    if (!role) return errorResponse("Unauthorized", 401);

    const { data, error } = await supabaseAdmin
      .from("products")
      .select(PRODUCT_OPTION_SELECT)
      .order("name", { ascending: true })
      .limit(1000);

    if (error) {
      return errorResponse("Failed to load product options", 400);
    }

    return successResponse(data || [], "Product options retrieved");
  } catch {
    return errorResponse("Failed to load product options", 500);
  }
}
