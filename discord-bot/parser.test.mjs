import assert from "node:assert/strict";
import test from "node:test";
import {
  CommandInputError,
  assertKnownFields,
  parseBoolean,
  parseCommandMessage,
  parseDateArgs,
  parseInvoiceItems,
  parseMoney,
} from "./parser.mjs";

const spec = (fields, freeText = [], positional) => () => ({ fields, freeText, positional });

test("parses repeated fields and multiline continuation", () => {
  const parsed = parseCommandMessage(`!invoice
lead: 081234567890
item: 2 | reta 10 mg
item: 1 x nad 500 mg
notes: first line
second line`);

  assert.equal(parsed.command, "!invoice");
  assert.equal(parsed.get("lead"), "081234567890");
  assert.deepEqual(parseInvoiceItems(parsed.getAll("item")), [
    { quantity: 2, query: "reta 10 mg", price: null },
    { quantity: 1, query: "nad 500 mg", price: null },
  ]);
  assert.equal(parsed.get("notes"), "first line\nsecond line");
  assert.deepEqual(parsed.keys, ["lead", "item", "notes"]);
});

test("keeps 'x: y' text inside free-text fields", () => {
  const parsed = parseCommandMessage(
    `!newleads
name: Budi
notes: Customer minta dihubungi
Jam: 10 pagi
status: hot`,
    spec(["name", "notes", "status"], ["notes"]),
  );
  assert.equal(parsed.get("notes"), "Customer minta dihubungi\nJam: 10 pagi");
  assert.equal(parsed.get("status"), "hot");
});

test("reports unknown fields outside free text", () => {
  const parsed = parseCommandMessage(
    `!newleads
name: Budi
stat: hot`,
    spec(["name", "status", "notes"], ["notes"]),
  );
  assert.throws(() => assertKnownFields(parsed, ["name", "status", "notes"], "!newleads"), /Field tidak dikenal: stat/);
});

test("accepts the first field on the command line", () => {
  const parsed = parseCommandMessage(
    `!newleads wa: 0812
name: Budi`,
    spec(["wa", "name"], [], false),
  );
  assert.equal(parsed.argumentText, "");
  assert.equal(parsed.get("wa"), "0812");
});

test("rejects text lines that are not fields", () => {
  assert.throws(() => parseCommandMessage("!newleads\nhalo"), CommandInputError);
});

test("keeps the complete positional product query", () => {
  const parsed = parseCommandMessage(`!updateproduct reta 10 mg
price: 1.750.000
usage_life: 8 weeks`);

  assert.equal(parsed.argumentText, "reta 10 mg");
  assert.equal(parseMoney(parsed.get("price")), 1_750_000);
  assert.equal(parsed.get("usage_life"), "8 weeks");
});

test("parses money formats", () => {
  assert.equal(parseMoney("1750000"), 1_750_000);
  assert.equal(parseMoney("1.750.000"), 1_750_000);
  assert.equal(parseMoney("1,750,000"), 1_750_000);
  assert.equal(parseMoney("Rp 1.750.000"), 1_750_000);
  assert.equal(parseMoney("1.75jt"), 1_750_000);
  assert.equal(parseMoney("1,5jt"), 1_500_000);
  assert.equal(parseMoney("350rb"), 350_000);
  assert.equal(parseMoney("25k"), 25_000);
  assert.equal(parseMoney("0"), 0);
  assert.equal(parseMoney(undefined), undefined);
  assert.throws(() => parseMoney("abc"), /tidak valid/);
  assert.throws(() => parseMoney("1.2.3"), /tidak valid/);
});

test("parses invoice items with custom price", () => {
  assert.deepEqual(parseInvoiceItems(["2 | reta 10 mg | 1.500.000", "1 | bac water 3ml | 0"]), [
    { quantity: 2, query: "reta 10 mg", price: 1_500_000 },
    { quantity: 1, query: "bac water 3ml", price: 0 },
  ]);
  assert.throws(() => parseInvoiceItems([]), /Minimal 1 baris item/);
  assert.throws(() => parseInvoiceItems(["reta 10 mg"]), /Format item 1 salah/);
  assert.throws(() => parseInvoiceItems(["0 | reta"]), /Qty item 1 harus 1-100/);
  assert.throws(() => parseInvoiceItems(["2 | reta | 1 | 2"]), /terlalu banyak/);
});

test("parses supported boolean forms", () => {
  assert.equal(parseBoolean("true"), true);
  assert.equal(parseBoolean("ya"), true);
  assert.equal(parseBoolean("false"), false);
  assert.equal(parseBoolean("tidak"), false);
  assert.equal(parseBoolean(undefined), undefined);
  assert.throws(() => parseBoolean("maybe", "is_reimburse"), /is_reimburse harus true atau false/);
});

test("parses date arguments", () => {
  const now = new Date("2026-10-31T20:00:00Z"); // 1 Nov 03:00 WIB
  assert.deepEqual(parseDateArgs([], now), { dateFrom: "2026-11-01", dateTo: "2026-11-01" });
  assert.deepEqual(parseDateArgs(["2026-10-01"], now), { dateFrom: "2026-10-01", dateTo: "2026-10-01" });
  assert.deepEqual(parseDateArgs(["2026-10-01", "2026-10-31"], now), { dateFrom: "2026-10-01", dateTo: "2026-10-31" });
  const range = { dateFrom: "2026-10-01", dateTo: "2026-10-31" };
  assert.deepEqual(parseDateArgs(["2026-10-01", "-", "2026-10-31"], now), range);
  assert.deepEqual(parseDateArgs(["2026-10-01-2026-10-31"], now), range);
  assert.deepEqual(parseDateArgs(["2026-10-01", "sampai", "2026-10-31"], now), range);
  assert.deepEqual(parseDateArgs(["2026-10-01", "s/d", "2026-10-31"], now), range);
  assert.deepEqual(parseDateArgs(["2026-10-01", "-"], now), { dateFrom: "2026-10-01", dateTo: "2026-10-01" });
  assert.throws(() => parseDateArgs(["2026-13-01"], now), /Format wajib YYYY-MM-DD/);
  assert.throws(() => parseDateArgs(["31-10-2026"], now), /Format wajib YYYY-MM-DD/);
  assert.throws(() => parseDateArgs(["2026-10-31", "2026-10-01"], now), /tidak boleh setelah/);
  assert.throws(() => parseDateArgs(["2026-10-01", "2026-10-02", "x"], now), /Maksimal 2 tanggal/);
});
