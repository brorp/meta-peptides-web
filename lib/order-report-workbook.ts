import ExcelJS from "exceljs";
import type { OrderReportRange, OrderReportRow } from "./order-report";

const IDR_FORMAT = '"Rp" #,##0.00;[Red]("Rp" #,##0.00);"Rp" 0.00';
const HEADER_ROW = 7;

function styleHeader(row: ExcelJS.Row) {
  row.height = 38;
  row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF172A32" } };
  row.alignment = { vertical: "middle", wrapText: true };
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, range: OrderReportRange, width: number) {
  sheet.mergeCells(1, 1, 1, width);
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { size: 20, bold: true, color: { argb: "FF172A32" } };
  sheet.getRow(1).height = 32;
  sheet.mergeCells(2, 1, 2, width);
  sheet.getCell("A2").value = `Periode tanggal order: ${range.dateFrom} s.d. ${range.dateTo} (WIB) • Semua status order`;
  sheet.getCell("A2").font = { size: 11, color: { argb: "FF475569" } };
  sheet.mergeCells(3, 1, 3, width);
  sheet.getCell("A3").value = "Nett invoice = total invoice tersimpan, sudah setelah diskon dan fee marketplace. Ongkir dicatat terpisah dan tidak mengurangi nett.";
  sheet.mergeCells(4, 1, 4, width);
  sheet.getCell("A4").value = "Nett diterima hanya untuk order ditandai sudah dibayar dan tidak cancelled. Pending / belum dibayar tetap tampil dalam detail dan total invoice.";
  sheet.mergeCells(5, 1, 5, width);
  sheet.getCell("A5").value = "Diskon lain / penyesuaian menjembatani subtotal ke invoice: nilai positif mengurangi invoice, nilai negatif menambah invoice. Satuan: IDR.";
  for (const row of [3, 4, 5]) {
    sheet.getRow(row).height = 30;
    sheet.getCell(row, 1).alignment = { wrapText: true, vertical: "middle" };
    sheet.getCell(row, 1).font = { size: 10, color: { argb: "FF475569" } };
  }
}

export function createOrderReportWorkbook(rows: OrderReportRow[], range: OrderReportRange) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MetaPeptides Admin";
  workbook.created = new Date();
  workbook.subject = `Laporan order ${range.dateFrom} s.d. ${range.dateTo}`;
  workbook.calcProperties.fullCalcOnLoad = true;

  const summary = workbook.addWorksheet("Ringkasan", {
    views: [{ state: "frozen", ySplit: HEADER_ROW }],
  });
  const detail = workbook.addWorksheet("Detail Orders", {
    views: [{ state: "frozen", ySplit: HEADER_ROW, xSplit: 4 }],
  });

  const columns: Array<{ key: keyof OrderReportRow | "number"; header: string; width: number }> = [
    { key: "number", header: "No.", width: 7 },
    { key: "type", header: "Tipe Order", width: 17 },
    { key: "channel", header: "Kanal", width: 17 },
    { key: "invoiceNumber", header: "No. Invoice", width: 27 },
    { key: "reference", header: "Referensi Marketplace / Manual", width: 28 },
    { key: "createdAt", header: "Tanggal Order (WIB)", width: 21 },
    { key: "status", header: "Status Order", width: 18 },
    { key: "paymentStatus", header: "Status Pembayaran", width: 19 },
    { key: "paidAt", header: "Tanggal Dibayar (WIB)", width: 21 },
    { key: "customer", header: "Customer", width: 25 },
    { key: "username", header: "Username", width: 20 },
    { key: "phone", header: "WhatsApp / Telepon", width: 21 },
    { key: "email", header: "Email", width: 30 },
    { key: "address", header: "Alamat", width: 40 },
    { key: "regional", header: "Domisili", width: 30 },
    { key: "postalCode", header: "Kode Pos", width: 12 },
    { key: "products", header: "Produk × Qty @ Harga Satuan (IDR)", width: 52 },
    { key: "units", header: "Total Qty", width: 12 },
    { key: "subtotal", header: "Subtotal Produk (IDR)", width: 22 },
    { key: "voucher", header: "Kode Voucher", width: 20 },
    { key: "discount", header: "Diskon / Voucher (IDR)", width: 22 },
    { key: "adjustment", header: "Diskon Lain / Penyesuaian (IDR)", width: 25 },
    { key: "marketplaceFee", header: "Fee Marketplace (IDR)", width: 22 },
    { key: "invoice", header: "Total Invoice (IDR)", width: 22 },
    { key: "shipping", header: "Biaya Kirim Terpisah (IDR)", width: 23 },
    { key: "nett", header: "Nett Invoice Tanpa Ongkir (IDR)", width: 25 },
    { key: "received", header: "Nett Diterima (IDR)", width: 23 },
    { key: "shipmentType", header: "Jenis Pengiriman", width: 20 },
    { key: "trackingNumber", header: "No. Resi", width: 26 },
    { key: "paymentTypes", header: "Metode Pembayaran", width: 25 },
    { key: "transactions", header: "Kode Transaksi", width: 30 },
    { key: "note", header: "Catatan", width: 40 },
    { key: "orderId", header: "Order ID", width: 39 },
  ];
  detail.columns = columns.map(({ key, width }) => ({ key, width }));
  addTitle(detail, "MetaPeptides • Detail Order", range, 17);
  detail.getRow(HEADER_ROW).values = columns.map((column) => column.header);
  styleHeader(detail.getRow(HEADER_ROW));

  const monetaryKeys = ["subtotal", "discount", "adjustment", "marketplaceFee", "invoice", "shipping", "nett", "received"] as const;
  const numericKeys = ["units", ...monetaryKeys] as const;
  for (const key of monetaryKeys) detail.getColumn(key).numFmt = IDR_FORMAT;
  detail.getColumn("units").numFmt = "#,##0";

  rows.forEach((data, index) => {
    const row = detail.addRow({ number: index + 1, ...data });
    row.alignment = { vertical: "top", wrapText: true };
    row.font = { name: "Calibri", size: 11 };
    row.height = Math.max(30, Math.min(180, data.products.split("\n").length * 17));
    const color = data.type === "WhatsApp" ? "FFF0FDF4"
      : data.type === "Marketplace" ? "FFFFF7ED" : "FFF1F5F9";
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    // Formula values have cached results so totals display before Excel recalculates.
    row.getCell("nett").value = { formula: `X${row.number}`, result: data.nett };
    row.getCell("received").value = {
      formula: `IF(AND(H${row.number}="Sudah dibayar",G${row.number}<>"cancelled"),Z${row.number},0)`,
      result: data.received,
    };
  });
  const lastDataRow = HEADER_ROW + rows.length;
  detail.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: Math.max(HEADER_ROW, lastDataRow), column: columns.length } };
  const detailTotal = detail.addRow({ customer: "TOTAL SEMUA ORDER" });
  for (const key of numericKeys) {
    const letter = detail.getColumn(key).letter;
    detailTotal.getCell(key).value = {
      formula: rows.length ? `SUM(${letter}${HEADER_ROW + 1}:${letter}${lastDataRow})` : "0",
      result: rows.reduce((sum, row) => sum + row[key], 0),
    };
  }
  styleHeader(detailTotal);

  const summaryColumns = [
    { key: "type", header: "Tipe / Kanal Order", width: 30 },
    { key: "count", header: "Jumlah Order", width: 16 },
    { key: "units", header: "Total Qty", width: 14 },
    { key: "subtotal", header: "Subtotal Produk (IDR)", width: 23 },
    { key: "discount", header: "Diskon / Voucher (IDR)", width: 23 },
    { key: "adjustment", header: "Diskon Lain / Penyesuaian (IDR)", width: 26 },
    { key: "marketplaceFee", header: "Fee Marketplace (IDR)", width: 23 },
    { key: "invoice", header: "Total Invoice (IDR)", width: 23 },
    { key: "shipping", header: "Biaya Kirim Terpisah (IDR)", width: 24 },
    { key: "nett", header: "Nett Invoice Tanpa Ongkir (IDR)", width: 26 },
    { key: "received", header: "Nett Diterima (IDR)", width: 24 },
  ];
  summary.columns = summaryColumns.map(({ key, width }) => ({ key, width }));
  addTitle(summary, "MetaPeptides • Laporan Order", range, summaryColumns.length);
  summary.getRow(HEADER_ROW).values = summaryColumns.map((column) => column.header);
  styleHeader(summary.getRow(HEADER_ROW));
  for (const key of monetaryKeys) summary.getColumn(key).numFmt = IDR_FORMAT;

  const groups = [
    { label: "WhatsApp", type: "WhatsApp" },
    { label: "Marketplace", type: "Marketplace" },
    { label: "Website", type: "Website" },
    ...(rows.some((row) => row.type === "Lainnya") ? [{ label: "Lainnya", type: "Lainnya" }] : []),
  ];
  function addSummaryRow(label: string, criterion: string, byChannel = false) {
    const matching = rows.filter((row) => (byChannel ? row.channel : row.type) === criterion);
    const row = summary.addRow({ type: label });
    const matchColumn = byChannel ? "C" : "B";
    const matchRange = `'Detail Orders'!${matchColumn}${HEADER_ROW + 1}:${matchColumn}${Math.max(HEADER_ROW + 1, lastDataRow)}`;
    row.getCell("count").value = { formula: `COUNTIF(${matchRange},A${row.number})`, result: matching.length };
    for (const key of numericKeys) {
      const letter = detail.getColumn(key).letter;
      row.getCell(key).value = {
        formula: `SUMIF(${matchRange},A${row.number},'Detail Orders'!${letter}${HEADER_ROW + 1}:${letter}${Math.max(HEADER_ROW + 1, lastDataRow)})`,
        result: matching.reduce((sum, order) => sum + order[key], 0),
      };
    }
    row.height = 28;
    row.alignment = { vertical: "middle" };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: row.number % 2 ? "FFF1F5F9" : "FFFFFFFF" } };
    return row;
  }
  groups.forEach((group) => addSummaryRow(group.label, group.type));
  const summaryTotal = summary.addRow({ type: "TOTAL SEMUA ORDER" });
  for (const column of summaryColumns.slice(1)) {
    const letter = summary.getColumn(column.key).letter;
    const result = column.key === "count" ? rows.length
      : rows.reduce((sum, row) => sum + row[column.key as "units" | typeof monetaryKeys[number]], 0);
    summaryTotal.getCell(column.key).value = {
      formula: `SUM(${letter}${HEADER_ROW + 1}:${letter}${summaryTotal.number - 1})`, result,
    };
  }
  styleHeader(summaryTotal);
  summary.addRow([]);
  const marketplaceTitle = summary.addRow(["RINCIAN MARKETPLACE"]);
  marketplaceTitle.font = { bold: true, color: { argb: "FF172A32" } };
  addSummaryRow("Shopee", "Shopee", true);
  addSummaryRow("Tokopedia", "Tokopedia", true);
  if (!rows.length) {
    summary.addRow([]);
    summary.addRow(["Tidak ada order pada rentang tanggal ini."]);
  }
  return workbook;
}
