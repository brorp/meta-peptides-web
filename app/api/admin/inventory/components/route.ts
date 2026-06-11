import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";

const normalizeComponents = (components: any) => {
  if (!Array.isArray(components)) return [];

  return components
    .map((component) => ({
      component_product_id: String(component?.component_product_id || ""),
      quantity_per_unit: Math.max(1, parseInt(component?.quantity_per_unit) || 1),
    }))
    .filter((component) => component.component_product_id);
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("product_inventory_components")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) return errorResponse(error.message, 400);

    return successResponse(data || [], "Inventory components retrieved");
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = String(body.product_id || "");

    if (!productId) return errorResponse("Product is required", 400);

    const components = normalizeComponents(body.components).filter(
      (component) => component.component_product_id !== productId,
    );

    const { error: deleteError } = await supabaseAdmin
      .from("product_inventory_components")
      .delete()
      .eq("product_id", productId);

    if (deleteError) return errorResponse(deleteError.message, 400);

    if (components.length) {
      const { error: insertError } = await supabaseAdmin
        .from("product_inventory_components")
        .insert(
          components.map((component) => ({
            product_id: productId,
            component_product_id: component.component_product_id,
            quantity_per_unit: component.quantity_per_unit,
          })),
        );

      if (insertError) return errorResponse(insertError.message, 400);
    }

    const { data, error } = await supabaseAdmin
      .from("product_inventory_components")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) return errorResponse(error.message, 400);

    return successResponse(data || [], "Inventory components updated");
  } catch (err: any) {
    return errorResponse(err.message || "Internal Server Error", 500);
  }
}
