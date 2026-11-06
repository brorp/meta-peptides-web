export const ORDER_REPORT_TIME_ZONE = "Asia/Jakarta";

export type OrderReportRange = {
  dateFrom: string;
  dateTo: string;
  from: string;
  until: string;
};

type Money = number | string | null;

export type ReportOrder = {
  id: string;
  invoice_number?: string | null;
  manual_reference?: string | null;
  created_at: string;
  order_source?: string | null;
  status: string;
  is_paid?: boolean | null;
  paid_at?: string | null;
  subtotal?: Money;
  total_price: Money;
  voucher_code?: string | null;
  voucher_discount_amount?: Money;
  marketplace_fee?: Money;
  shipping_fee?: Money;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_email?: string | null;
  shipping_address?: string | null;
  shipping_regional?: string | null;
  shipping_zip?: string | null;
  shipment_type?: string | null;
  tracking_number?: string | null;
  customer_username?: string | null;
  note?: string | null;
  order_items?: Array<{
    product_id?: string | null;
    quantity: Money;
    price_at_purchase: Money;
    products?: { name?: string | null; label?: string | null; volume?: string | null } | null;
  }> | null;
  payments?: Array<{
    payment_type?: string | null;
    transaction_code?: string | null;
  }> | null;
};

export function getOrderReportDateInput(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ORDER_REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseOrderReportRange(
  dateFrom: string | null,
  dateTo: string | null,
): OrderReportRange | null {
  if (!dateFrom || !dateTo || !isCalendarDate(dateFrom) || !isCalendarDate(dateTo)) {
    return null;
  }
  if (dateFrom > dateTo) return null;

  const from = new Date(`${dateFrom}T00:00:00.000+07:00`);
  const until = new Date(`${dateTo}T00:00:00.000+07:00`);
  until.setUTCDate(until.getUTCDate() + 1);

  return { dateFrom, dateTo, from: from.toISOString(), until: until.toISOString() };
}

function amount(value: Money | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function reportDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ORDER_REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function toOrderReportRow(order: ReportOrder) {
  const source = order.order_source || "checkout";
  const channels: Record<string, [string, string]> = {
    manual_whatsapp: ["WhatsApp", "WhatsApp"],
    shopee: ["Marketplace", "Shopee"],
    tokopedia: ["Marketplace", "Tokopedia"],
    checkout: ["Website", "Website"],
  };
  const [type, channel] = channels[source] || ["Lainnya", source];
  const items = order.order_items || [];
  const subtotal = order.subtotal == null
    ? items.reduce((sum, item) => sum + amount(item.quantity) * amount(item.price_at_purchase), 0)
    : amount(order.subtotal);
  const discount = amount(order.voucher_discount_amount);
  const marketplaceFee = amount(order.marketplace_fee);
  // total_price already includes discounts/marketplace fees. shipping_fee is
  // a separate operational expense, so subtracting any of them again is wrong.
  const invoice = amount(order.total_price);
  const received = order.is_paid === true && order.status !== "cancelled" ? invoice : 0;

  return {
    type,
    channel,
    orderId: order.id,
    invoiceNumber: order.invoice_number || order.id,
    reference: order.manual_reference || "",
    createdAt: reportDate(order.created_at),
    status: order.status,
    paymentStatus: order.is_paid ? "Sudah dibayar" : "Belum dibayar",
    paidAt: reportDate(order.paid_at),
    customer: order.shipping_name || "",
    username: order.customer_username || "",
    phone: order.shipping_phone || "",
    email: order.shipping_email || "",
    address: order.shipping_address || "",
    regional: order.shipping_regional || "",
    postalCode: order.shipping_zip || "",
    products: items.map((item) => {
      const name = item.products?.name || item.product_id || "Produk dihapus";
      const volume = item.products?.volume ? ` (${item.products.volume})` : "";
      return `${name}${volume} × ${amount(item.quantity)} @ ${amount(item.price_at_purchase)}`;
    }).join("\n"),
    units: items.reduce((sum, item) => sum + amount(item.quantity), 0),
    subtotal,
    voucher: order.voucher_code || "",
    discount,
    // Includes member discounts and manual total adjustments not recorded as a voucher.
    adjustment: Math.round((subtotal - discount - marketplaceFee - invoice) * 100) / 100,
    marketplaceFee,
    invoice,
    shipping: amount(order.shipping_fee),
    nett: invoice,
    received,
    shipmentType: order.shipment_type || "",
    trackingNumber: order.tracking_number || "",
    paymentTypes: [...new Set((order.payments || []).map((payment) => payment.payment_type).filter(Boolean))].join(", "),
    transactions: [...new Set((order.payments || []).map((payment) => payment.transaction_code).filter(Boolean))].join(", "),
    note: order.note || "",
  };
}

export type OrderReportRow = ReturnType<typeof toOrderReportRow>;

export function prepareOrderReportRows(orders: ReportOrder[]) {
  const groupOrder = ["WhatsApp", "Marketplace", "Website", "Lainnya"];
  return orders.map(toOrderReportRow).sort((left, right) =>
    groupOrder.indexOf(left.type) - groupOrder.indexOf(right.type) ||
    left.channel.localeCompare(right.channel) ||
    left.createdAt.localeCompare(right.createdAt) ||
    left.orderId.localeCompare(right.orderId),
  );
}
