import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const EXPORT_BATCH_SIZE = 1000;
const MAX_SEARCH_LENGTH = 100;

const BASE_PRODUCT_SELECT = [
  "id",
  "name",
  "label",
  "slug",
  "price",
  "original_price",
  "stock",
  "usage_days",
  "image_url",
  "category",
  "purity",
  "volume",
  "formula",
  "cas",
  "short_desc",
  "overview",
  "storage_instruction",
  "usage_instruction",
  "dosing",
  "complimentary_product_id",
  "complimentary_quantity",
  "inventory_type",
  "is_active",
  "created_at",
  "updated_at",
];

const normalizeSearchKeyword = (value: string | null) =>
  String(value || "")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[,%()]/g, " ")
    .replace(/\s+/g, " ");

const toDateOrNull = (value: unknown) => {
  if (!value) return null;

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

async function loadProducts(role: "root" | "admin", keyword: string) {
  const selectFields = [
    ...BASE_PRODUCT_SELECT,
    ...(role === "root" ? ["cost_of_goods"] : []),
  ].join(", ");
  const products: any[] = [];

  for (let from = 0; ; from += EXPORT_BATCH_SIZE) {
    let query = supabaseAdmin
      .from("products")
      .select(selectFields)
      .order("name", { ascending: true })
      .range(from, from + EXPORT_BATCH_SIZE - 1);

    if (keyword) {
      query = query.or(
        `name.ilike.%${keyword}%,label.ilike.%${keyword}%`,
      );
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    products.push(...(data || []));
    if (!data || data.length < EXPORT_BATCH_SIZE) break;
  }

  return products;
}

async function loadComplimentaryProductNames(products: any[]) {
  const complimentaryIds = Array.from(
    new Set(
      products
        .map((product) => product.complimentary_product_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const names = new Map<string, string>();

  for (let index = 0; index < complimentaryIds.length; index += 200) {
    const ids = complimentaryIds.slice(index, index + 200);
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .in("id", ids);

    if (error) throw new Error(error.message);
    for (const product of data || []) {
      names.set(product.id, product.name || "Complimentary Item");
    }
  }

  return names;
}

function createProductsWorkbook(
  products: any[],
  role: "root" | "admin",
  keyword: string,
  complimentaryNames: Map<string, string>,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MetaPeptides Admin";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = keyword
    ? `Products matching: ${keyword}`
    : "All products";

  const worksheet = workbook.addWorksheet("Products", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 20 },
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "No.", key: "number", width: 8 },
    { header: "Product Name", key: "name", width: 28 },
    { header: "Label", key: "label", width: 24 },
    { header: "Slug", key: "slug", width: 28 },
    { header: "Inventory Type", key: "inventory_type", width: 16 },
    { header: "Category", key: "category", width: 22 },
    { header: "Price (IDR)", key: "price", width: 18 },
    { header: "Original Price (IDR)", key: "original_price", width: 20 },
    ...(role === "root"
      ? [{ header: "COGS (IDR)", key: "cost_of_goods", width: 18 }]
      : []),
    { header: "Stock", key: "stock", width: 11 },
    { header: "Usage Days", key: "usage_days", width: 13 },
    { header: "Volume / Size", key: "volume", width: 16 },
    { header: "Purity", key: "purity", width: 12 },
    { header: "Formula", key: "formula", width: 18 },
    { header: "CAS Number", key: "cas", width: 18 },
    { header: "Complimentary Product", key: "complimentary_product", width: 25 },
    { header: "Complimentary Qty", key: "complimentary_quantity", width: 18 },
    { header: "Status", key: "status", width: 12 },
    { header: "Short Description", key: "short_desc", width: 35 },
    { header: "Overview", key: "overview", width: 40 },
    { header: "Storage Instruction", key: "storage_instruction", width: 35 },
    { header: "Usage Instruction", key: "usage_instruction", width: 35 },
    { header: "Dosing", key: "dosing", width: 35 },
    { header: "Cover Image URL", key: "image_url", width: 45 },
    { header: "Created At", key: "created_at", width: 21 },
    { header: "Updated At", key: "updated_at", width: 21 },
  ];

  worksheet.columns = columns;
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  products.forEach((product, index) => {
    worksheet.addRow({
      number: index + 1,
      name: product.name || "",
      label: product.label || "",
      slug: product.slug || "",
      inventory_type: product.inventory_type || "product",
      category: product.category || "",
      price: Number(product.price || 0),
      original_price:
        product.original_price === null || product.original_price === undefined
          ? null
          : Number(product.original_price),
      ...(role === "root"
        ? { cost_of_goods: Number(product.cost_of_goods || 0) }
        : {}),
      stock: Number(product.stock || 0),
      usage_days: Number(product.usage_days || 0),
      volume: product.volume || "",
      purity: product.purity || "",
      formula: product.formula || "",
      cas: product.cas || "",
      complimentary_product: product.complimentary_product_id
        ? complimentaryNames.get(product.complimentary_product_id) || ""
        : "",
      complimentary_quantity: product.complimentary_product_id
        ? Number(product.complimentary_quantity || 1)
        : null,
      status: product.is_active !== false ? "Active" : "Hidden",
      short_desc: product.short_desc || "",
      overview: product.overview || "",
      storage_instruction: product.storage_instruction || "",
      usage_instruction: product.usage_instruction || "",
      dosing: product.dosing || "",
      image_url: product.image_url || "",
      created_at: toDateOrNull(product.created_at),
      updated_at: toDateOrNull(product.updated_at),
    });
  });

  const header = worksheet.getRow(1);
  header.height = 28;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF172A32" },
  };

  worksheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: "top", wrapText: rowNumber > 1 };
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFDCE3E6" } },
      };
    });

    if (rowNumber > 1 && rowNumber % 2 === 1) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4F8F8" },
      };
    }
  });

  [
    "price",
    "original_price",
    ...(role === "root" ? ["cost_of_goods"] : []),
  ].forEach((key) => {
    const column = worksheet.getColumn(key);
    column.numFmt = '"Rp" #,##0';
  });
  worksheet.getColumn("stock").numFmt = "#,##0";
  worksheet.getColumn("usage_days").numFmt = "#,##0";
  worksheet.getColumn("complimentary_quantity").numFmt = "#,##0";
  worksheet.getColumn("created_at").numFmt = "yyyy-mm-dd hh:mm";
  worksheet.getColumn("updated_at").numFmt = "yyyy-mm-dd hh:mm";

  const statusColumn = worksheet.getColumn("status").number;
  worksheet.addConditionalFormatting({
    ref: `${worksheet.getColumn(statusColumn).letter}2:${worksheet.getColumn(statusColumn).letter}${Math.max(2, worksheet.rowCount)}`,
    rules: [
      {
        type: "containsText",
        priority: 1,
        operator: "containsText",
        text: "Active",
        style: {
          font: { color: { argb: "FF166534" }, bold: true },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDCFCE7" },
          },
        },
      },
      {
        type: "containsText",
        priority: 2,
        operator: "containsText",
        text: "Hidden",
        style: {
          font: { color: { argb: "FF991B1B" }, bold: true },
          fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
          },
        },
      },
    ],
  });

  return workbook;
}

export async function GET(req: NextRequest) {
  try {
    const role = await getAdminSessionFromCookies();
    if (!role) return errorResponse("Unauthorized", 401);
    if (role !== "root") {
      return errorResponse("Only root admin can export products", 403);
    }

    const keyword = normalizeSearchKeyword(
      new URL(req.url).searchParams.get("keyword"),
    );
    const products = await loadProducts(role, keyword);
    const complimentaryNames = await loadComplimentaryProductNames(products);
    const workbook = createProductsWorkbook(
      products,
      role,
      keyword,
      complimentaryNames,
    );
    const workbookBuffer = await workbook.xlsx.writeBuffer();
    const today = new Date().toISOString().slice(0, 10);
    const filename = `meta-peptides-products-${today}.xlsx`;

    return new NextResponse(new Uint8Array(workbookBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse("Failed to export products", 500);
  }
}
