import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import {
  getOrderReportDateInput,
  parseOrderReportRange,
  prepareOrderReportRows,
  toOrderReportRow,
} from "../lib/order-report.ts";
import { createOrderReportWorkbook } from "../lib/order-report-workbook.ts";

const range = parseOrderReportRange("2026-11-01", "2026-11-06");
const order = {
  id: "order-1",
  created_at: "2026-11-01T17:00:00Z",
  order_source: "manual_whatsapp",
  status: "completed",
  is_paid: true,
  subtotal: "1000000",
  voucher_discount_amount: "100000",
  marketplace_fee: "50000",
  total_price: "850000",
  shipping_fee: "25000",
  order_items: [
    { product_id: "p1", quantity: 2, price_at_purchase: 500000, products: { name: "Product", volume: "5mg" } },
    { product_id: "p2", quantity: 1, price_at_purchase: 0, products: null },
  ],
};

test("date range includes full Jakarta days with an exclusive next-day boundary", () => {
  assert.equal(range.from, "2026-10-31T17:00:00.000Z");
  assert.equal(range.until, "2026-11-06T17:00:00.000Z");
  assert.equal(getOrderReportDateInput(new Date("2026-10-31T18:00:00Z")), "2026-11-01");
  const oneDay = parseOrderReportRange("2026-11-06", "2026-11-06");
  assert.equal(new Date(oneDay.until) - new Date(oneDay.from), 86400000);
  assert.ok(parseOrderReportRange("2024-02-29", "2024-02-29"));
  for (const [from, to] of [
    [null, "2026-11-06"], ["", ""], ["2026-02-29", "2026-03-01"],
    ["2026-11-31", "2026-12-01"], ["2026-11-07", "2026-11-06"],
    ["2026-11-01T00:00:00Z", "2026-11-06"],
  ]) assert.equal(parseOrderReportRange(from, to), null);
});

test("nett preserves the stored invoice without deducting discounts, marketplace fees or shipping twice", () => {
  const row = toOrderReportRow(order);
  assert.equal(row.nett, 850000);
  assert.equal(row.received, 850000);
  assert.equal(row.discount, 100000);
  assert.equal(row.marketplaceFee, 50000);
  assert.equal(row.shipping, 25000);
  assert.equal(row.adjustment, 0);
  assert.equal(row.createdAt, "2026-11-02 00:00");
  assert.equal(row.units, 3);
  assert.match(row.products, /p2 × 1 @ 0/);
});

test("extra member discounts and manual adjustments reconcile to the authoritative invoice", () => {
  const discounted = toOrderReportRow({ ...order, total_price: 800000 });
  assert.equal(discounted.adjustment, 50000);
  assert.equal(discounted.subtotal - discounted.discount - discounted.adjustment - discounted.marketplaceFee, discounted.invoice);
  assert.equal(toOrderReportRow({ ...order, total_price: 900000 }).adjustment, -50000);
  assert.equal(toOrderReportRow({ ...order, subtotal: null }).subtotal, 1000000);
  assert.equal(toOrderReportRow({ ...order, total_price: 0 }).nett, 0);
});

test("all statuses remain in report but unpaid and cancelled invoices do not inflate receipts", () => {
  const rows = prepareOrderReportRows([
    order,
    { ...order, id: "pending", status: "pending_review", is_paid: false },
    { ...order, id: "cancelled", status: "cancelled", is_paid: true },
    { ...order, id: "processing", status: "processing", is_paid: true },
  ]);
  assert.equal(rows.length, 4);
  assert.equal(rows.reduce((sum, row) => sum + row.received, 0), 1700000);
  assert.equal(rows.reduce((sum, row) => sum + row.invoice, 0), 3400000);
});

test("orders are grouped by type and marketplace channel without dropping legacy sources", () => {
  const rows = prepareOrderReportRows([
    { ...order, id: "website", order_source: null },
    { ...order, id: "tokopedia", order_source: "tokopedia" },
    { ...order, id: "unknown", order_source: "legacy" },
    { ...order, id: "shopee", order_source: "shopee" },
    order,
  ]);
  assert.deepEqual(rows.map((row) => row.type), ["WhatsApp", "Marketplace", "Marketplace", "Website", "Lainnya"]);
  assert.deepEqual(rows.map((row) => row.channel), ["WhatsApp", "Shopee", "Tokopedia", "Website", "legacy"]);
});

test("saved XLSX reconciles grouped totals, preserves text and contains one row per order", async () => {
  const rows = prepareOrderReportRows([
    { ...order, shipping_phone: "08123450001", note: '=HYPERLINK("https://example.com")' },
    { ...order, id: "shopee", order_source: "shopee", total_price: 750000, is_paid: false },
    { ...order, id: "tokopedia", order_source: "tokopedia", total_price: 600000 },
    { ...order, id: "website", order_source: "checkout", total_price: 500000, status: "cancelled" },
  ]);
  const workbook = createOrderReportWorkbook(rows, range);
  const saved = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(saved);
  const summary = loaded.getWorksheet("Ringkasan");
  const detail = loaded.getWorksheet("Detail Orders");
  assert.equal(loaded.worksheets.length, 2);
  assert.equal(detail.rowCount, rows.length + 8);
  assert.equal(detail.getCell("L8").value, "08123450001");
  assert.equal(detail.getCell("AF8").type, ExcelJS.ValueType.String);
  assert.equal(detail.getCell("Z8").formula, "X8");
  assert.equal(detail.getCell("Z8").result, 850000);
  assert.equal(summary.getCell("B9").result, 2);
  assert.equal(summary.getCell("H9").result, 1350000);
  assert.equal(summary.getCell("K9").result, 600000);
  assert.equal(summary.getCell("B11").result, 4);
  assert.equal(summary.getCell("H11").result, 2700000);
  assert.equal(summary.getCell("K11").result, 1450000);
  assert.equal(summary.getCell("A14").value, "Shopee");
  assert.equal(summary.getCell("H14").result, 750000);
  assert.equal(summary.getCell("H15").result, 600000);
  assert.equal(detail.autoFilter, "A7:AG11");
});

test("empty report exports explicit zero totals and a no-orders message", async () => {
  const workbook = createOrderReportWorkbook([], range);
  const saved = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(saved);
  assert.equal(loaded.getWorksheet("Ringkasan").getCell("K11").result, 0);
  assert.equal(loaded.getWorksheet("Detail Orders").getCell("Z8").result, 0);
  assert.equal(loaded.getWorksheet("Ringkasan").getCell("A17").value, "Tidak ada order pada rentang tanggal ini.");
});
