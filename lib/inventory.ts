import { supabaseAdmin } from "@/lib/supabase-server";

export async function deductOrderInventory(orderId: string, client = supabaseAdmin) {
  const { error } = await client.rpc("deduct_order_inventory", {
    p_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message || "Failed to deduct inventory");
  }
}

export function normalizePaymentType(value: unknown) {
  const paymentType = String(value || "").trim();

  if (paymentType === "Shopee" || paymentType === "QRIS") {
    return paymentType;
  }

  return "Bank Transfer";
}
