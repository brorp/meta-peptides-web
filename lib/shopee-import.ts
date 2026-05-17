import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabase-server";

const SHOPEE_SOURCE = "shopee";
const SHOPEE_CHANNEL = "shopee";

type ShopeeRawRow = Record<string, unknown>;

type ProductRecord = {
    id: string;
    name: string | null;
    label: string | null;
    volume: string | null;
    slug: string | null;
    price: number | null;
};

type ShopeeItem = {
    orderNumber: string;
    orderStatus: string;
    trackingNumber: string;
    shippingOption: string;
    orderCreatedAt: string;
    paymentPaidAt: string;
    completedAt: string;
    paymentMethod: string;
    parentSku: string;
    productName: string;
    sku: string;
    variation: string;
    quantity: number;
    returnedQuantity: number;
    grossUnitPrice: number;
    discountedUnitPrice: number;
    rowSubtotal: number;
    totalPayment: number;
    sellerVoucher: number;
    buyerShippingFee: number;
    estimatedShippingFee: number;
    buyerNote: string;
    sellerNote: string;
    buyerUsername: string;
    recipientName: string;
    phone: string;
    address: string;
    city: string;
    province: string;
    raw: ShopeeRawRow;
};

type ShopeeGroup = {
    orderNumber: string;
    rows: ShopeeItem[];
};

export type ShopeeImportOrderResult = {
    orderNumber: string;
    orderId: string | null;
    action: "created" | "updated" | "would_create" | "would_update";
    customerName: string;
    itemCount: number;
    totalPrice: number;
    productResolutions: Array<{
        name: string;
        action: "matched" | "created" | "would_create";
    }>;
};

export type ShopeeImportResult = {
    dryRun: boolean;
    totalRows: number;
    totalOrders: number;
    processedOrders: number;
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ orderNumber: string; message: string }>;
    orders: ShopeeImportOrderResult[];
};

type ImportOptions = {
    dryRun?: boolean;
    limit?: number;
};

const normalizeHeader = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "");

const slugify = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80);

const getValue = (row: ShopeeRawRow, aliases: string[]) => {
    const normalized = new Map(
        Object.keys(row).map((key) => [normalizeHeader(key), key]),
    );

    for (const alias of aliases) {
        const key = normalized.get(normalizeHeader(alias));
        if (key) return String(row[key] ?? "").trim();
    }

    return "";
};

const parseCurrency = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;

    const raw = String(value ?? "").trim();
    if (!raw) return 0;

    const cleaned = raw.replace(/[^\d,.-]/g, "");
    if (!cleaned) return 0;

    const isIndonesianThousands = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned);
    const normalized = isIndonesianThousands
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const parseQuantity = (value: unknown) => {
    const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const extractStrengths = (value: string) => {
    const matches = value.matchAll(/(\d+(?:[.,]\d+)?)\s*(mg|mcg|ml|iu)\b/gi);
    return Array.from(matches).map((match) =>
        `${match[1].replace(",", ".")}${match[2].toLowerCase()}`,
    );
};

const cleanShopeeProductName = (name: string, variation: string) => {
    const cleaned = name
        .replace(/\s*-\s*Include\s+\d+\s*ml\s*Bac\s*Water/gi, "")
        .replace(/\s*Include\s+\d+\s*ml\s*Bac\s*Water/gi, "")
        .replace(/\s*by\s+Metapeptides/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    return variation ? `${cleaned} - ${variation}` : cleaned;
};

const scoreProductMatch = (product: ProductRecord, item: ShopeeItem) => {
    const itemText = normalizeText(
        `${item.productName} ${item.variation} ${item.sku} ${item.parentSku}`,
    );
    const itemStrengths = extractStrengths(`${item.productName} ${item.variation}`);
    const productName = normalizeText(product.name || "");
    const productLabel = normalizeText(product.label || "");
    const productVolumeStrengths = extractStrengths(product.volume || "");

    if (!productName) return 0;

    const normalizedSku = normalizeText(item.sku || item.parentSku);
    if (normalizedSku && productLabel && normalizedSku === productLabel) {
        return 100;
    }

    if (!itemText.includes(productName)) return 0;

    const hasItemStrength = itemStrengths.length > 0;
    const hasProductStrength = productVolumeStrengths.length > 0;
    const strengthMatches =
        hasItemStrength &&
        hasProductStrength &&
        productVolumeStrengths.some((strength) => itemStrengths.includes(strength));

    if (strengthMatches) return 90;
    if (hasItemStrength && hasProductStrength && !strengthMatches) return 0;
    if ((product.name || "").length <= 4 && !strengthMatches) return 0;

    return 60;
};

const getShopeeStatus = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes("batal") || normalized.includes("cancel")) {
        return "cancelled";
    }
    if (normalized.includes("selesai") || normalized.includes("complete")) {
        return "completed";
    }
    return "processing";
};

const parseShopeeItem = (row: ShopeeRawRow): ShopeeItem => {
    const productName = getValue(row, ["Nama Produk", "Product Name"]);
    const variation = getValue(row, ["Nama Variasi", "Variation Name"]);
    const quantity = parseQuantity(getValue(row, ["Jumlah", "Quantity"]));
    const grossUnitPrice = parseCurrency(getValue(row, ["Harga Awal"]));
    const discountedUnitPrice = parseCurrency(
        getValue(row, ["Harga Setelah Diskon"]),
    );

    return {
        orderNumber: getValue(row, ["No. Pesanan", "No Pesanan", "Order ID"]),
        orderStatus: getValue(row, ["Status Pesanan"]),
        trackingNumber: getValue(row, ["No. Resi", "Tracking Number"]),
        shippingOption: getValue(row, ["Opsi Pengiriman"]),
        orderCreatedAt: getValue(row, ["Waktu Pesanan Dibuat"]),
        paymentPaidAt: getValue(row, ["Waktu Pembayaran Dilakukan"]),
        completedAt: getValue(row, ["Waktu Pesanan Selesai"]),
        paymentMethod: getValue(row, ["Metode Pembayaran"]),
        parentSku: getValue(row, ["SKU Induk"]),
        productName,
        sku: getValue(row, ["Nomor Referensi SKU"]),
        variation,
        quantity,
        returnedQuantity: parseQuantity(getValue(row, ["Returned quantity"])),
        grossUnitPrice,
        discountedUnitPrice,
        rowSubtotal:
            parseCurrency(getValue(row, ["Subtotal Pesanan"])) ||
            grossUnitPrice * quantity,
        totalPayment: parseCurrency(getValue(row, ["Total Pembayaran"])),
        sellerVoucher: parseCurrency(getValue(row, ["Voucher Ditanggung Penjual"])),
        buyerShippingFee: parseCurrency(
            getValue(row, ["Ongkos Kirim Dibayar oleh Pembeli"]),
        ),
        estimatedShippingFee: parseCurrency(
            getValue(row, ["Perkiraan Ongkos Kirim"]),
        ),
        buyerNote: getValue(row, ["Catatan dari Pembeli"]),
        sellerNote: getValue(row, ["Catatan"]),
        buyerUsername: getValue(row, ["Username (Pembeli)", "Username Pembeli"]),
        recipientName: getValue(row, ["Nama Penerima"]),
        phone: getValue(row, ["No. Telepon", "No Telepon"]),
        address: getValue(row, ["Alamat Pengiriman"]),
        city: getValue(row, ["Kota/Kabupaten", "Kota Kabupaten"]),
        province: getValue(row, ["Provinsi"]),
        raw: row,
    };
};

const parseWorkbook = (input: ArrayBuffer | Buffer): ShopeeItem[] => {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const rows = XLSX.utils.sheet_to_json<ShopeeRawRow>(workbook.Sheets[sheetName], {
        defval: "",
        raw: false,
    });

    return rows
        .map(parseShopeeItem)
        .filter((item) => item.orderNumber && item.productName && item.quantity > 0);
};

const groupByOrderNumber = (items: ShopeeItem[]) => {
    const groups = new Map<string, ShopeeGroup>();

    for (const item of items) {
        if (!groups.has(item.orderNumber)) {
            groups.set(item.orderNumber, {
                orderNumber: item.orderNumber,
                rows: [],
            });
        }

        groups.get(item.orderNumber)!.rows.push(item);
    }

    return Array.from(groups.values());
};

const loadProducts = async () => {
    const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, label, volume, slug, price");

    if (error) throw new Error(`Failed to load products: ${error.message}`);
    return (data || []) as ProductRecord[];
};

const findBestProduct = (products: ProductRecord[], item: ShopeeItem) => {
    let best: { product: ProductRecord; score: number } | null = null;

    for (const product of products) {
        const score = scoreProductMatch(product, item);
        if (score > (best?.score || 0)) best = { product, score };
    }

    return best && best.score >= 60 ? best.product : null;
};

const createShopeeProduct = async (
    item: ShopeeItem,
    products: ProductRecord[],
    orderNumber: string,
) => {
    const displayName = cleanShopeeProductName(item.productName, item.variation);
    const baseSlug = slugify(displayName) || `shopee-item-${orderNumber}`;
    let slug = baseSlug;
    let suffix = 1;

    while (products.some((product) => product.slug === slug)) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
    }

    const { data, error } = await supabaseAdmin
        .from("products")
        .insert({
            name: displayName,
            label: item.sku || item.parentSku || "SHOPEE",
            slug,
            price: item.discountedUnitPrice || item.grossUnitPrice || 0,
            original_price:
                item.grossUnitPrice && item.grossUnitPrice !== item.discountedUnitPrice
                    ? item.grossUnitPrice
                    : null,
            stock: 0,
            category: "Shopee Import",
            short_desc: "Imported from a Shopee order spreadsheet.",
            is_active: false,
        })
        .select("id, name, label, volume, slug, price")
        .single();

    if (error || !data) {
        throw new Error(`Failed to create Shopee product: ${error?.message}`);
    }

    const product = data as ProductRecord;
    products.push(product);
    return product;
};

const resolveProduct = async (
    item: ShopeeItem,
    products: ProductRecord[],
    dryRun: boolean,
    orderNumber: string,
) => {
    const matched = findBestProduct(products, item);
    if (matched) {
        return {
            productId: matched.id,
            action: "matched" as const,
            name: matched.name || item.productName,
        };
    }

    const name = cleanShopeeProductName(item.productName, item.variation);
    if (dryRun) {
        return {
            productId: null,
            action: "would_create" as const,
            name,
        };
    }

    const created = await createShopeeProduct(item, products, orderNumber);
    return {
        productId: created.id,
        action: "created" as const,
        name: created.name || name,
    };
};

const buildNote = (group: ShopeeGroup) => {
    const first = group.rows[0];
    const lines = [
        "Imported from Shopee XLSX.",
        `Shopee order no: ${group.orderNumber}`,
        first.orderStatus ? `Shopee status: ${first.orderStatus}` : "",
        first.buyerUsername ? `Shopee username: ${first.buyerUsername}` : "",
        first.trackingNumber ? `Tracking: ${first.trackingNumber}` : "",
        first.shippingOption ? `Courier: ${first.shippingOption}` : "",
        first.paymentMethod ? `Payment method: ${first.paymentMethod}` : "",
        first.orderCreatedAt ? `Order created: ${first.orderCreatedAt}` : "",
        first.paymentPaidAt ? `Paid at: ${first.paymentPaidAt}` : "",
        first.completedAt ? `Completed at: ${first.completedAt}` : "",
        first.buyerNote ? `Buyer note: ${first.buyerNote}` : "",
        first.sellerNote ? `Seller note: ${first.sellerNote}` : "",
    ];

    return lines.filter(Boolean).join("\n");
};

const calculateOrderTotals = (group: ShopeeGroup) => {
    const subtotal = group.rows.reduce((sum, item) => {
        const quantity = Math.max(0, item.quantity - item.returnedQuantity);
        return sum + (item.rowSubtotal || item.grossUnitPrice * quantity);
    }, 0);
    const totalPrice =
        group.rows.find((item) => item.totalPayment > 0)?.totalPayment ||
        group.rows.reduce((sum, item) => {
            const quantity = Math.max(0, item.quantity - item.returnedQuantity);
            return sum + (item.discountedUnitPrice || item.grossUnitPrice) * quantity;
        }, 0);
    const voucherDiscountAmount = Math.max(0, subtotal - totalPrice);
    const shippingFee =
        group.rows.find((item) => item.buyerShippingFee > 0)?.buyerShippingFee ||
        group.rows.find((item) => item.estimatedShippingFee > 0)?.estimatedShippingFee ||
        0;

    return {
        subtotal,
        totalPrice,
        voucherDiscountAmount,
        shippingFee,
    };
};

const findExistingShopeeOrder = async (orderNumber: string) => {
    const { data, error } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("order_source", SHOPEE_SOURCE)
        .eq("manual_reference", orderNumber)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to check existing Shopee order: ${error.message}`);
    }

    return data?.id as string | undefined;
};

const upsertShopeeOrder = async (
    group: ShopeeGroup,
    products: ProductRecord[],
    dryRun: boolean,
): Promise<ShopeeImportOrderResult> => {
    const first = group.rows[0];
    const existingOrderId = await findExistingShopeeOrder(group.orderNumber);
    const totals = calculateOrderTotals(group);
    const productResolutions = [];
    const itemRows = [];

    for (const item of group.rows) {
        const quantity = Math.max(0, item.quantity - item.returnedQuantity);
        if (quantity <= 0) continue;

        const resolved = await resolveProduct(
            item,
            products,
            dryRun,
            group.orderNumber,
        );

        productResolutions.push({
            name: resolved.name,
            action: resolved.action,
        });

        if (resolved.productId) {
            itemRows.push({
                product_id: resolved.productId,
                quantity,
                price_at_purchase:
                    item.discountedUnitPrice || item.grossUnitPrice || 0,
            });
        }
    }

    const customerName =
        first.recipientName ||
        first.buyerUsername ||
        `Shopee ${group.orderNumber}`;

    if (dryRun) {
        return {
            orderNumber: group.orderNumber,
            orderId: existingOrderId || null,
            action: existingOrderId ? "would_update" : "would_create",
            customerName,
            itemCount: group.rows.length,
            totalPrice: totals.totalPrice,
            productResolutions,
        };
    }

    if (!itemRows.length) {
        throw new Error("No importable Shopee order items were found.");
    }

    const orderPayload = {
        user_id: null,
        is_guest: true,
        status: getShopeeStatus(first.orderStatus),
        total_price: totals.totalPrice,
        subtotal: totals.subtotal,
        tax: 0,
        shipping_fee: totals.shippingFee,
        shipping_name: customerName,
        shipping_phone: first.phone || "Shopee masked phone",
        shipping_email: null,
        shipping_address: first.address || "Shopee address unavailable",
        shipping_regional: [first.city, first.province].filter(Boolean).join(", "),
        shipping_zip: null,
        note: buildNote(group),
        voucher_code: totals.voucherDiscountAmount > 0 ? "SHOPEE" : null,
        voucher_id: null,
        voucher_discount_amount: totals.voucherDiscountAmount,
        order_source: SHOPEE_SOURCE,
        manual_channel: SHOPEE_CHANNEL,
        manual_reference: group.orderNumber,
    };

    let orderId = existingOrderId || null;

    if (existingOrderId) {
        const { error } = await supabaseAdmin
            .from("orders")
            .update(orderPayload)
            .eq("id", existingOrderId);

        if (error) throw new Error(`Failed to update order: ${error.message}`);
    } else {
        const { data, error } = await supabaseAdmin
            .from("orders")
            .insert(orderPayload)
            .select("id")
            .single();

        if (error || !data) {
            throw new Error(`Failed to create order: ${error?.message}`);
        }

        orderId = data.id;
    }

    await supabaseAdmin.from("payments").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
        itemRows.map((item) => ({
            order_id: orderId,
            ...item,
        })),
    );

    if (itemsError) {
        throw new Error(`Failed to save order items: ${itemsError.message}`);
    }

    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
        order_id: orderId,
        receipt_url: "",
        transaction_code: `SHOPEE-${group.orderNumber}`,
        sender_name: customerName,
        status: "pending",
    });

    if (paymentError) {
        throw new Error(`Failed to save payment: ${paymentError.message}`);
    }

    return {
        orderNumber: group.orderNumber,
        orderId,
        action: existingOrderId ? "updated" : "created",
        customerName,
        itemCount: itemRows.length,
        totalPrice: totals.totalPrice,
        productResolutions,
    };
};

export const importShopeeOrders = async (
    input: ArrayBuffer | Buffer,
    options: ImportOptions = {},
): Promise<ShopeeImportResult> => {
    const dryRun = options.dryRun === true;
    const parsedRows = parseWorkbook(input);
    const allGroups = groupByOrderNumber(parsedRows);
    const groups = options.limit ? allGroups.slice(0, options.limit) : allGroups;

    if (!parsedRows.length || !allGroups.length) {
        return {
            dryRun,
            totalRows: parsedRows.length,
            totalOrders: allGroups.length,
            processedOrders: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [
                {
                    orderNumber: "-",
                    message: "No Shopee orders were found in this spreadsheet.",
                },
            ],
            orders: [],
        };
    }

    const products = await loadProducts();
    const result: ShopeeImportResult = {
        dryRun,
        totalRows: parsedRows.length,
        totalOrders: allGroups.length,
        processedOrders: groups.length,
        created: 0,
        updated: 0,
        skipped: allGroups.length - groups.length,
        errors: [],
        orders: [],
    };

    for (const group of groups) {
        try {
            const orderResult = await upsertShopeeOrder(group, products, dryRun);
            result.orders.push(orderResult);

            if (orderResult.action === "created") result.created += 1;
            if (orderResult.action === "updated") result.updated += 1;
        } catch (error: any) {
            result.errors.push({
                orderNumber: group.orderNumber,
                message: error?.message || "Failed to import this Shopee order.",
            });
        }
    }

    return result;
};
