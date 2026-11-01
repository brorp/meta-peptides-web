import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCustomerInvoiceText,
  formatDateId,
  formatOrderLine,
  jakartaDate,
  orderTypeLabel,
  productLabel,
  rupiah,
  splitMessage,
  waLink,
} from "./format.mjs";

test("reminder lines tag Shopee/Tokopedia orders", () => {
  const entry = {
    customer: { name: "Budi", phone: "6281234567890" },
    due_date: "2026-11-01",
    items: [{ name: "Retatrutide 10mg", quantity: 1 }],
    invoice_number: "MW-20261031-01001",
    order_date: "2026-10-31",
    lead: { status: "hot", origin: "shopee", rejection: null, pic: "cs_ana", notes: null },
  };
  assert.match(formatOrderLine({ ...entry, order_source: "shopee" }), /Invoice MW-20261031-01001 \(Shopee\) • order 2026-10-31/);
  assert.match(formatOrderLine({ ...entry, order_source: "manual_whatsapp" }), /Invoice MW-20261031-01001 • order 2026-10-31/);
  assert.equal(orderTypeLabel("tokopedia"), "Tokopedia");
  assert.equal(orderTypeLabel("manual_whatsapp"), "WhatsApp");
});

test("formats rupiah and dates", () => {
  assert.equal(rupiah(1750000), "Rp1.750.000");
  assert.equal(rupiah(-50000), "-Rp50.000");
  assert.equal(formatDateId("2026-10-31"), "31 Okt 2026");
  assert.equal(jakartaDate("2026-10-30T17:00:00+00:00"), "2026-10-31");
  assert.equal(waLink("+62 812-3456"), "<https://wa.me/628123456>");
});

test("does not repeat the volume already in the product name", () => {
  assert.equal(productLabel({ name: "Retatrutide 10mg", volume: "10mg" }), "Retatrutide 10mg");
  assert.equal(productLabel({ name: "BPC-157", volume: "10 mg" }), "BPC-157 10 mg");
});

test("builds WhatsApp-ready invoice text", () => {
  const text = buildCustomerInvoiceText(
    {
      invoice_number: "MW-20261031-01001",
      order_date: "2026-10-31",
      shipping_name: "Budi",
      shipping_phone: "6281234567890",
      shipping_address: "Jl. Mawar 1",
      shipping_regional: "Tangerang",
      shipping_zip: "15147",
      subtotal: 5500000,
      voucher_discount_amount: 50000,
      total_price: 5450000,
      is_paid: false,
      payment: { payment_type: "Bank Transfer" },
      order_items: [
        { display_name: "Retatrutide 10mg", quantity: 2, price_at_purchase: 1750000 },
        { display_name: "Bac Water 3ml", quantity: 1, price_at_purchase: 0 },
      ],
    },
    { brandName: "MetaPeptides", paymentInfo: "Transfer ke BCA 123" },
  );

  assert.match(text, /^\*INVOICE MW-20261031-01001\*/);
  assert.match(text, /1\. Retatrutide 10mg\n {3}2 x Rp1\.750\.000 = Rp3\.500\.000/);
  assert.match(text, /2\. Bac Water 3ml\n {3}1 x GRATIS/);
  assert.match(text, /Diskon: -Rp50\.000/);
  assert.match(text, /\*Total: Rp5\.450\.000\*/);
  assert.match(text, /Status: MENUNGGU PEMBAYARAN\n\nTransfer ke BCA 123/);
  assert.doesNotMatch(text, /\*\*/, "no Discord-only bold");
});

test("splits long messages under the Discord limit", () => {
  const blocks = Array.from({ length: 60 }, (_, index) => `Entry ${index}\n${"x".repeat(80)}`);
  const chunks = splitMessage(blocks.join("\n\n"));
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(chunk.length <= 1900);
  assert.equal(chunks.join("\n\n"), blocks.join("\n\n"));
  assert.deepEqual(splitMessage(""), ["-"]);
  assert.ok(splitMessage("y".repeat(5000)).every((chunk) => chunk.length <= 1900));
});
