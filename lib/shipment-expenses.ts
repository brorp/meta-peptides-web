import { supabaseAdmin } from "@/lib/supabase-server";

const SHIPMENT_EXPENSE_SOURCE = "shipment_fee";
const SHIPMENT_EXPENSE_CATEGORY = "Shipping";

export function normalizeShipmentType(value: unknown) {
  return String(value || "").trim() || null;
}

export function normalizeShipmentFee(value: unknown) {
  const fee = Number(value || 0);
  return Number.isFinite(fee) && fee > 0 ? fee : 0;
}

function shouldSyncShipmentExpense(orderSource?: string | null) {
  return orderSource !== "shopee";
}

function orderSourceLabel(orderSource?: string | null) {
  return orderSource === "manual_whatsapp" ? "WhatsApp manual" : "website";
}

function getExpenseDate(createdAt?: string | null) {
  const date = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export async function syncShipmentExpenseForOrder({
  orderId,
  orderSource,
  shippingFee,
  shipmentType,
  shippingName,
  createdAt,
}: {
  orderId: string;
  orderSource?: string | null;
  shippingFee: number;
  shipmentType?: string | null;
  shippingName?: string | null;
  createdAt?: string | null;
}) {
  if (!shouldSyncShipmentExpense(orderSource)) return;

  const normalizedFee = normalizeShipmentFee(shippingFee);
  const normalizedShipmentType = normalizeShipmentType(shipmentType);
  const sourceLabel = orderSourceLabel(orderSource);

  if (normalizedFee <= 0) {
    const { error } = await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("source_type", SHIPMENT_EXPENSE_SOURCE)
      .eq("source_order_id", orderId);

    if (error) throw new Error(error.message);
    return;
  }

  const expensePayload = {
    title: `Shipment fee - ${String(shippingName || `${sourceLabel} order`).trim()}`,
    category: SHIPMENT_EXPENSE_CATEGORY,
    amount: normalizedFee,
    expense_date: getExpenseDate(createdAt),
    vendor: normalizedShipmentType,
    payment_method: null,
    notes: `Auto-created from ${sourceLabel} order ${orderId.slice(0, 8).toUpperCase()}. This cost is not included in the invoice total.`,
    source_type: SHIPMENT_EXPENSE_SOURCE,
    source_order_id: orderId,
  };

  const { data: existingExpense, error: lookupError } = await supabaseAdmin
    .from("expenses")
    .select("id")
    .eq("source_type", SHIPMENT_EXPENSE_SOURCE)
    .eq("source_order_id", orderId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const expenseMutation = existingExpense?.id
    ? supabaseAdmin
        .from("expenses")
        .update(expensePayload)
        .eq("id", existingExpense.id)
    : supabaseAdmin.from("expenses").insert(expensePayload);

  const { error } = await expenseMutation;

  if (error) throw new Error(error.message);
}
