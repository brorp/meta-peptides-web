import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAdminApiSession } from "@/lib/admin-api";

const ANALYTICS_ORDER_STATUSES = ["processing", "completed"];
const RANGE_OPTIONS = ["today", "this_week", "this_month", "90_days"] as const;
const PLACEHOLDER_CUSTOMER_VALUES = new Set([
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "null",
  "undefined",
  "unknown",
]);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getDateRange(rangeParam: string | null) {
  const range = RANGE_OPTIONS.includes(rangeParam as any)
    ? (rangeParam as (typeof RANGE_OPTIONS)[number])
    : "this_month";
  const now = new Date();
  let from = startOfDay(now);

  if (range === "this_week") {
    const day = from.getDay();
    const diff = day === 0 ? 6 : day - 1;
    from.setDate(from.getDate() - diff);
  }

  if (range === "this_month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (range === "90_days") {
    from.setDate(from.getDate() - 89);
  }

  return {
    range,
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

function domicileLabel(regional?: string | null) {
  const parts = String(regional || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const domicile = parts.at(-1);

  return domicile ? domicile.toUpperCase() : "UNSPECIFIED";
}

function isExcludedBestSeller(product: { name?: string; label?: string | null }) {
  const excludedProducts = new Set(["bac water s", "bac water l"]);
  const normalize = (value?: string | null) =>
    String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

  return (
    excludedProducts.has(normalize(product.name)) ||
    excludedProducts.has(normalize(product.label))
  );
}

function normalizeCustomerValue(value?: string | null) {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) return "";

  const lowered = normalized.toLowerCase();
  if (PLACEHOLDER_CUSTOMER_VALUES.has(lowered) || /^-+$/.test(normalized)) {
    return "";
  }

  return normalized;
}

function normalizeCustomerPhone(value?: string | null) {
  const normalized = normalizeCustomerValue(value);
  const digits = normalized.replace(/\D/g, "");

  return digits.length >= 6 ? digits : "";
}

function customerKey(order: any) {
  const username = normalizeCustomerValue(order.customer_username);
  if (username) return `username:${username.toLowerCase()}`;

  const email = normalizeCustomerValue(order.shipping_email);
  if (email) return `email:${email.toLowerCase()}`;

  const phone = normalizeCustomerPhone(order.shipping_phone);
  if (phone) return `phone:${phone}`;

  const name = normalizeCustomerValue(order.shipping_name);
  if (name) return `name:${name.toLowerCase()}`;

  return `order:${order.id}`;
}

function customerLabel(order: any) {
  const handle = normalizeCustomerValue(order.customer_username);
  if (handle) return `@${handle}`;

  return (
    normalizeCustomerValue(order.shipping_name) ||
    normalizeCustomerValue(order.shipping_email) ||
    normalizeCustomerValue(order.shipping_phone) ||
    "Customer"
  );
}

function getGrossOrderAmount(order: any) {
  const subtotal = Number(order.subtotal || 0);
  if (Number.isFinite(subtotal) && subtotal > 0) return subtotal;

  const itemGross = ((order as any).order_items || []).reduce(
    (sum: number, item: any) =>
      sum + Number(item.quantity || 0) * Number(item.price_at_purchase || 0),
    0,
  );

  if (itemGross > 0) return itemGross;

  return Number(order.total_price || 0);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const dateRange = getDateRange(searchParams.get("range"));

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, created_at, total_price, subtotal, shipping_name, shipping_phone, shipping_email, shipping_regional, customer_username, order_source, shipment_type, shipping_fee, order_items(product_id, quantity, price_at_purchase, products(id, name, label))",
      )
      .in("status", ANALYTICS_ORDER_STATUSES)
      .gte("created_at", dateRange.from)
      .lte("created_at", dateRange.to);

    if (error) return errorResponse("Failed to load order analytics", 400);

    const productMap = new Map<
      string,
      { productId: string; name: string; label: string | null; units: number; revenue: number }
    >();
    const spenderMap = new Map<
      string,
      { name: string; total: number; orders: number }
    >();
    const domicileMap = new Map<string, { label: string; value: number; revenue: number }>();
    const shipmentMap = new Map<string, { label: string; orders: number; fees: number }>();

    let unitsSold = 0;
    let totalRevenue = 0;
    let totalShipmentFees = 0;

    for (const order of orders || []) {
      const orderTotal = getGrossOrderAmount(order);
      totalRevenue += orderTotal;

      const key = customerKey(order);
      const spender = spenderMap.get(key) || {
        name: customerLabel(order),
        total: 0,
        orders: 0,
      };
      spender.total += orderTotal;
      spender.orders += 1;
      spenderMap.set(key, spender);

      const domicile = domicileLabel(order.shipping_regional);
      const domicileRow = domicileMap.get(domicile) || {
        label: domicile,
        value: 0,
        revenue: 0,
      };
      domicileRow.value += 1;
      domicileRow.revenue += orderTotal;
      domicileMap.set(domicile, domicileRow);

      const shipmentFee = Number(order.shipping_fee || 0);
      if (order.order_source === "manual_whatsapp" && shipmentFee > 0) {
        totalShipmentFees += shipmentFee;
        const shipmentLabel = order.shipment_type || "Unspecified";
        const shipment = shipmentMap.get(shipmentLabel) || {
          label: shipmentLabel,
          orders: 0,
          fees: 0,
        };
        shipment.orders += 1;
        shipment.fees += shipmentFee;
        shipmentMap.set(shipmentLabel, shipment);
      }

      for (const item of (order as any).order_items || []) {
        const quantity = Number(item.quantity || 0);
        unitsSold += quantity;
        const product = item.products || {};
        if (isExcludedBestSeller(product)) continue;

        const productId = product.id || item.product_id || "unknown";
        const productRow = productMap.get(productId) || {
          productId,
          name: product.name || "Product",
          label: product.label || null,
          units: 0,
          revenue: 0,
        };
        productRow.units += quantity;
        productRow.revenue += quantity * Number(item.price_at_purchase || 0);
        productMap.set(productId, productRow);
      }
    }

    const orderCount = orders?.length || 0;
    const bestSellers = Array.from(productMap.values())
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 6);
    const topSpenders = Array.from(spenderMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return successResponse(
      {
        range: dateRange.range,
        from: dateRange.from,
        to: dateRange.to,
        orderCount,
        unitsSold,
        totalRevenue,
        averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
        uniqueCustomers: spenderMap.size,
        totalShipmentFees,
        topSpender: topSpenders[0] || null,
        bestSeller: bestSellers[0] || null,
        bestSellers,
        topSpenders,
        domicileDistribution: Array.from(domicileMap.values()).sort(
          (a, b) => b.value - a.value,
        ),
        shipmentBreakdown: Array.from(shipmentMap.values()).sort(
          (a, b) => b.fees - a.fees,
        ),
      },
      "Order analytics retrieved",
    );
  } catch (err: any) {
    return errorResponse("Failed to load order analytics", 500);
  }
}
