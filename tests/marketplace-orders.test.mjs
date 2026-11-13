import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as marketplace from "../lib/marketplace-amounts.ts";
import { toOrderReportRow } from "../lib/order-report.ts";

const current = {
  id: "test-order",
  status: "completed",
  order_source: "shopee",
  subtotal: 1000000,
  voucher_discount_amount: 100000,
  total_price: 850000,
  marketplace_fee: 50000,
  shipping_name: "Test Customer",
  shipping_fee: 25000,
};

test("net input derives the fee after discounts, independently of shipping", () => {
  const result = marketplace.calculateMarketplaceAmounts(1000000, 825000, 100000);
  assert.equal(result.success, true);
  assert.equal(result.values.marketplaceFee, 75000);
  assert.equal(result.values.totalPrice, 825000);
  const report = toOrderReportRow({ ...current, marketplace_fee: result.values.marketplaceFee, total_price: result.values.totalPrice });
  assert.equal(report.nett, 825000);
  assert.equal(report.adjustment, 0);
  assert.equal(report.shipping, 25000);
});

test("zero payout, zero fee and fractional currency remain valid", () => {
  assert.equal(marketplace.calculateMarketplaceAmounts(1000, 0).values.marketplaceFee, 1000);
  assert.equal(marketplace.calculateMarketplaceAmounts(1000, 1000).values.marketplaceFee, 0);
  assert.equal(marketplace.calculateMarketplaceAmounts("1000.50", "900.25").values.marketplaceFee, 100.25);
  assert.equal(marketplace.resolveMarketplaceCreateAmounts(0.3, { manual_discount_amount: 0.1, marketplace_fee: 0.2 }).values.totalPrice, 0);
});

test("empty, negative, non-finite and excessive net amounts are rejected", () => {
  for (const net of ["", " ", null, undefined, true, [], {}, "abc", NaN, Infinity, -1, 900001]) {
    assert.equal(marketplace.calculateMarketplaceAmounts(1000000, net, 100000).success, false, String(net));
  }
  assert.equal(marketplace.calculateMarketplaceAmounts(-1, 0).success, false);
  assert.equal(marketplace.calculateMarketplaceAmounts(100, 0, 101).success, false);
});

test("new net amounts override stale fee inputs while legacy API clients still work", () => {
  const fresh = marketplace.resolveMarketplaceCreateAmounts(1000000, { marketplace_net_total: "925000", marketplace_fee: 1 });
  assert.equal(fresh.values.marketplaceFee, 75000);
  const legacy = marketplace.resolveMarketplaceCreateAmounts(1000000, { marketplace_fee: 75000 });
  assert.equal(legacy.values.totalPrice, 925000);
  assert.equal(marketplace.resolveMarketplaceCreateAmounts(100, { marketplace_fee: -1 }).success, false);
});

test("partial marketplace updates preserve net and keep the fee reconciled", () => {
  const netOnly = marketplace.resolveMarketplaceUpdate(current, { marketplace_net_total: 800000 });
  assert.equal(netOnly.values.marketplaceFee, 100000);
  const changedInvoice = marketplace.resolveMarketplaceUpdate(current, { subtotal: 1100000 });
  assert.equal(changedInvoice.values.totalPrice, 850000);
  assert.equal(changedInvoice.values.marketplaceFee, 150000);
  const oldClient = marketplace.resolveMarketplaceUpdate(current, { marketplace_fee: 75000 });
  assert.equal(oldClient.values.totalPrice, 825000);
  assert.equal(marketplace.resolveMarketplaceUpdate(current, { status: "processing" }).values, null);
});

test("WhatsApp and Website financial flows are unaffected", () => {
  for (const source of ["manual_whatsapp", "checkout"]) {
    const order = { ...current, order_source: source };
    assert.equal(marketplace.resolveMarketplaceUpdate(order, { total_price: 900000 }).values, null);
    assert.equal(marketplace.resolveMarketplaceUpdate(order, { marketplace_net_total: 900000 }).success, false);
  }
});

// Execute the real route handlers against an in-memory database boundary.
// This checks which values the API actually persists without touching orders,
// stock, payments, shipment expenses or customer email in the live database.
function loadRoute(path, initial = current) {
  const state = { order: { ...initial }, writes: [] };
  const supabaseAdmin = {
    from(table) {
      const query = {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        insert(value) {
          state.writes.push({ table, value });
          if (table === "orders") state.order = { id: "created-order", ...value };
          return this;
        },
        update(value) {
          state.writes.push({ table, value });
          if (table === "orders") state.order = { ...state.order, ...value };
          return this;
        },
        async single() { return { data: state.order, error: null }; },
        then(resolve, reject) {
          const data = table === "products" ? [{ id: "p1", name: "Test Product", inventory_type: "product" }] : null;
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const modules = {
    "next/server": {},
    "@/lib/supabase-server": { supabaseAdmin },
    "@/lib/api-response": {
      successResponse: (data, message, status = 200) => ({ data, message, status }),
      errorResponse: (message, status = 400) => ({ message, status }),
    },
    "@/lib/admin-api": { requireAdminApiSession: async () => ({ role: "root", response: null }) },
    "@/lib/marketplace-amounts": marketplace,
    "@/lib/order-schema-compat": {
      isMissingCustomerUsernameColumn: () => false,
      isMissingTrackingNumberColumn: () => false,
      withoutTrackingNumberSelect: (select) => select,
    },
    "@/lib/inventory": { deductOrderInventory: async () => {}, normalizePaymentType: (type) => type },
    "@/lib/shipment-expenses": {
      normalizeShipmentType: (type) => type || null,
      normalizeShipmentFee: (fee) => Number(fee || 0),
      syncShipmentExpenseForOrder: async () => {},
    },
    "@/lib/email-service": { sendOrderVerifiedEmail: async () => true },
    "@/lib/pdf/generate-invoice": { renderInvoicePdfBuffer: async () => Buffer.alloc(0) },
  };
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, console,
    require(name) { if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`); return modules[name]; },
  });
  return { handlers: exports, state };
}

const createPayload = {
  order_source: "shopee", status: "processing", shipping_name: "Test Customer",
  shipping_phone: "081200000000", shipping_address: "Test address", shipping_regional: "Jakarta",
  marketplace_net_total: "925000", items: [{ product_id: "p1", quantity: 2, price_at_purchase: 500000 }],
};

test("POST persists the derived fee and exact net payout for Shopee and Tokopedia", async () => {
  for (const source of ["shopee", "tokopedia"]) {
    const { handlers, state } = loadRoute("../app/api/admin/orders/route.ts");
    const response = await handlers.POST({ json: async () => ({ ...createPayload, order_source: source }) });
    assert.equal(response.status, 201);
    assert.equal(state.order.subtotal, 1000000);
    assert.equal(state.order.marketplace_fee, 75000);
    assert.equal(state.order.total_price, 925000);
    assert.equal("marketplace_net_total" in state.order, false);
  }
});

test("POST rejects invalid net payouts before creating an order, items or payment", async () => {
  for (const net of ["", -1, 1000001]) {
    const { handlers, state } = loadRoute("../app/api/admin/orders/route.ts");
    const response = await handlers.POST({ json: async () => ({ ...createPayload, marketplace_net_total: net }) });
    assert.equal(response.status, 400);
    assert.equal(state.writes.length, 0);
  }
});

test("PUT derives the stored fee from the updated subtotal, discount and net", async () => {
  const { handlers, state } = loadRoute("../app/api/admin/orders/[id]/route.ts");
  const response = await handlers.PUT({ json: async () => ({ subtotal: 1100000, voucher_discount_amount: 100000, marketplace_net_total: "925000" }) }, { params: Promise.resolve({ id: current.id }) });
  assert.equal(response.status, 200);
  assert.equal(state.order.marketplace_fee, 75000);
  assert.equal(state.order.total_price, 925000);
  assert.equal(state.order.shipping_fee, 25000);
});

test("PUT rejects excess net without writing and keeps status-only updates independent", async () => {
  const invalid = loadRoute("../app/api/admin/orders/[id]/route.ts");
  const response = await invalid.handlers.PUT({ json: async () => ({ marketplace_net_total: 900001 }) }, { params: Promise.resolve({ id: current.id }) });
  assert.equal(response.status, 400);
  assert.equal(invalid.state.writes.length, 0);
  const statusOnly = loadRoute("../app/api/admin/orders/[id]/route.ts");
  const saved = await statusOnly.handlers.PUT({ json: async () => ({ status: "completed" }) }, { params: Promise.resolve({ id: current.id }) });
  assert.equal(saved.status, 200);
  assert.equal(statusOnly.state.order.marketplace_fee, 50000);
  assert.equal(statusOnly.state.order.total_price, 850000);
});
