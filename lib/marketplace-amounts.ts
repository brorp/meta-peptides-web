type MarketplaceAmounts = {
  subtotal: number;
  discount: number;
  totalPrice: number;
  marketplaceFee: number;
};

type AmountResult =
  | { success: true; values: MarketplaceAmounts }
  | { success: false; message: string };

function parseAmount(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateMarketplaceAmounts(
  subtotalInput: unknown,
  netTotalInput: unknown,
  discountInput: unknown = 0,
): AmountResult {
  const subtotal = parseAmount(subtotalInput);
  const discount = parseAmount(discountInput);
  const totalPrice = parseAmount(netTotalInput);
  if (subtotal === null) return { success: false, message: "Subtotal invoice tidak valid." };
  if (discount === null || discount > subtotal) {
    return { success: false, message: "Diskon harus antara 0 dan subtotal invoice." };
  }
  if (totalPrice === null) {
    return { success: false, message: "Isi total bersih marketplace dengan angka 0 atau lebih." };
  }

  const invoiceTotal = Math.round((subtotal - discount) * 100) / 100;
  if (totalPrice > invoiceTotal) {
    return { success: false, message: "Total bersih marketplace tidak boleh melebihi total invoice setelah diskon." };
  }
  return {
    success: true,
    values: {
      subtotal,
      discount,
      totalPrice,
      marketplaceFee: Math.round((invoiceTotal - totalPrice) * 100) / 100,
    },
  };
}

// Old API clients may still submit a fee. New clients always submit the net
// amount; it takes precedence so the stored fee cannot be set independently.
export function resolveMarketplaceCreateAmounts(
  subtotal: number,
  body: Record<string, unknown>,
): AmountResult {
  const discount = body.manual_discount_amount ?? 0;
  if (body.marketplace_net_total !== undefined) {
    return calculateMarketplaceAmounts(subtotal, body.marketplace_net_total, discount);
  }
  const fee = parseAmount(body.marketplace_fee ?? 0);
  const parsedDiscount = parseAmount(discount);
  if (fee === null) return { success: false, message: "Marketplace fee tidak valid." };
  if (parsedDiscount === null) return { success: false, message: "Diskon tidak valid." };
  return calculateMarketplaceAmounts(subtotal, Math.round((subtotal - parsedDiscount - fee) * 100) / 100, parsedDiscount);
}

export function resolveMarketplaceUpdate(
  current: {
    order_source?: string | null;
    subtotal?: number | string | null;
    total_price: number | string;
    voucher_discount_amount?: number | string | null;
  },
  body: Record<string, unknown>,
): { success: true; values: MarketplaceAmounts | null } | { success: false; message: string } {
  const isMarketplace = current.order_source === "shopee" || current.order_source === "tokopedia";
  if (!isMarketplace) {
    return body.marketplace_net_total === undefined
      ? { success: true, values: null }
      : { success: false, message: "Total bersih marketplace hanya untuk order Shopee atau Tokopedia." };
  }
  if (!["subtotal", "voucher_discount_amount", "total_price", "marketplace_fee", "marketplace_net_total"].some((key) => body[key] !== undefined)) {
    return { success: true, values: null };
  }

  const subtotal = body.subtotal !== undefined ? body.subtotal : current.subtotal ?? current.total_price;
  const discount = body.voucher_discount_amount !== undefined
    ? body.voucher_discount_amount : current.voucher_discount_amount ?? 0;
  let netTotal = body.marketplace_net_total !== undefined
    ? body.marketplace_net_total : body.total_price !== undefined ? body.total_price : current.total_price;
  if (body.marketplace_net_total === undefined && body.total_price === undefined && body.marketplace_fee !== undefined) {
    const fee = parseAmount(body.marketplace_fee);
    const parsedSubtotal = parseAmount(subtotal);
    const parsedDiscount = parseAmount(discount);
    if (fee === null || parsedSubtotal === null || parsedDiscount === null) {
      return { success: false, message: "Nilai invoice atau marketplace fee tidak valid." };
    }
    netTotal = Math.round((parsedSubtotal - parsedDiscount - fee) * 100) / 100;
  }
  return calculateMarketplaceAmounts(subtotal, netTotal, discount);
}
