import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
    paginateResponse,
    errorResponse,
    successResponse,
} from "@/lib/api-response";
import {
    isMissingCustomerUsernameColumn,
    withoutCustomerUsername,
} from "@/lib/order-schema-compat";
import { deductOrderInventory, normalizePaymentType } from "@/lib/inventory";
import {
    normalizeShipmentFee,
    normalizeShipmentType,
    syncShipmentExpenseForOrder,
} from "@/lib/shipment-expenses";
import { requireAdminApiSession } from "@/lib/admin-api";

const ORDER_STATUSES = [
    "pending_review",
    "processing",
    "completed",
    "cancelled",
];

const ORDER_SOURCES = ["manual_whatsapp", "shopee"];
const ORDER_SORT_FIELDS = [
    "created_at",
    "shipping_name",
    "total_price",
    "status",
    "order_source",
    "shipping_fee",
];
const ADMIN_ORDER_LIST_SELECT =
    "id, status, created_at, total_price, subtotal, voucher_discount_amount, marketplace_fee, shipping_name, shipping_email, customer_username, order_source, manual_reference, shipping_fee, shipment_type, order_items(id, quantity, price_at_purchase, products(name, image_url))";
const ADMIN_ORDER_DETAIL_SELECT =
    "id, status, created_at, total_price, subtotal, voucher_code, voucher_discount_amount, marketplace_fee, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_regional, shipping_zip, customer_username, note, tracking_number, order_source, manual_channel, manual_reference, shipping_fee, shipment_type, order_items(id, product_id, quantity, price_at_purchase, products(name, label, volume, image_url, slug)), payments(id, transaction_code, payment_type, status, receipt_url)";
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ManualOrderItemPayload = {
    product_id: string;
    quantity: number;
    price_at_purchase: number;
};

const normalizeManualOrderItems = (items: any): ManualOrderItemPayload[] => {
    if (!Array.isArray(items)) return [];

    return items
        .map((item) => ({
            product_id: String(item?.product_id || ""),
            quantity: Number(item?.quantity || 0),
            price_at_purchase: Number(item?.price_at_purchase || 0),
        }))
        .filter(
            (item) =>
                !!item.product_id &&
                Number.isFinite(item.quantity) &&
                item.quantity > 0 &&
                Number.isFinite(item.price_at_purchase) &&
                item.price_at_purchase >= 0,
        );
};

const cleanupFailedManualOrder = async (orderId: string | null) => {
    if (!orderId) return;

    await supabaseAdmin
        .from("expenses")
        .delete()
        .eq("source_type", "shipment_fee")
        .eq("source_order_id", orderId);
    await supabaseAdmin.from("payments").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);
    await supabaseAdmin.from("orders").delete().eq("id", orderId);
};

const normalizeSort = (sortBy: string | null, sortDir: string | null) => ({
    sortBy: ORDER_SORT_FIELDS.includes(sortBy || "")
        ? String(sortBy)
        : "created_at",
    ascending: sortDir === "asc",
});

const buildOrderSearchFilter = (
    rawKeyword: string,
    { includeCustomerUsername }: { includeCustomerUsername: boolean },
) => {
    const keyword = rawKeyword.trim().replace(/[,()]/g, " ").trim();
    if (!keyword) return "";

    const textFilters = [
        `shipping_name.ilike.%${keyword}%`,
        `shipping_email.ilike.%${keyword}%`,
        `shipping_phone.ilike.%${keyword}%`,
        `manual_reference.ilike.%${keyword}%`,
    ];

    if (includeCustomerUsername) {
        textFilters.push(`customer_username.ilike.%${keyword}%`);
    }

    if (UUID_PATTERN.test(rawKeyword.trim())) {
        textFilters.push(`id.eq.${rawKeyword.trim()}`);
    }

    return textFilters.join(",");
};

export async function GET(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status") || "";
        const keyword = searchParams.get("keyword") || "";
        const { sortBy, ascending } = normalizeSort(
            searchParams.get("sort_by"),
            searchParams.get("sort_dir"),
        );

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("orders")
            .select(ADMIN_ORDER_LIST_SELECT, {
                count: "exact",
            });

        if (status) {
            query = query.eq("status", status);
        }

        if (keyword) {
            const searchFilter = buildOrderSearchFilter(keyword, {
                includeCustomerUsername: true,
            });
            if (searchFilter) query = query.or(searchFilter);
        }

        let { data, error, count } = await query
            .order(sortBy, { ascending })
            .range(from, to);

        if (error && keyword && isMissingCustomerUsernameColumn(error)) {
            let fallbackQuery = supabaseAdmin
                .from("orders")
                .select(ADMIN_ORDER_LIST_SELECT, {
                    count: "exact",
                });

            if (status) {
                fallbackQuery = fallbackQuery.eq("status", status);
            }

            const fallbackSearchFilter = buildOrderSearchFilter(keyword, {
                includeCustomerUsername: false,
            });
            if (fallbackSearchFilter) fallbackQuery = fallbackQuery.or(fallbackSearchFilter);

            const fallback = await fallbackQuery
                .order(sortBy, { ascending })
                .range(from, to);

            data = fallback.data;
            error = fallback.error;
            count = fallback.count;
        }

        if (error) return errorResponse("Failed to load orders", 400);

        return paginateResponse(
            data,
            page,
            limit,
            count || 0,
            "Orders retrieved",
        );
    } catch (err: any) {
        return errorResponse("Failed to load orders", 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const body = await req.json();
        const shippingName = String(body.shipping_name || "").trim();
        const shippingPhone = String(body.shipping_phone || "").trim();
        const shippingEmail = String(body.shipping_email || "").trim().toLowerCase();
        const shippingAddress = String(body.shipping_address || "").trim();
        const shippingRegional = String(body.shipping_regional || "").trim();
        const shippingZip = String(body.shipping_zip || "").trim();
        const customerUsername = String(body.customer_username || "").trim();
        const manualReference = String(body.manual_reference || "").trim();
        const note = String(body.note || "").trim();
        const orderSource = ORDER_SOURCES.includes(body.order_source)
            ? body.order_source
            : "manual_whatsapp";
        const manualChannel = orderSource === "shopee" ? "shopee" : "whatsapp";
        const status = ORDER_STATUSES.includes(body.status)
            ? body.status
            : "processing";
        const manualDiscountAmount = Math.max(
            0,
            Number(body.manual_discount_amount || 0),
        );
        const marketplaceFee = Math.max(0, Number(body.marketplace_fee || 0));
        const shipmentType =
            orderSource === "manual_whatsapp"
                ? normalizeShipmentType(body.shipment_type)
                : null;
        const shipmentFee =
            orderSource === "manual_whatsapp"
                ? normalizeShipmentFee(body.shipping_fee)
                : 0;
        const paymentType = normalizePaymentType(
            body.payment_type || (orderSource === "shopee" ? "Shopee" : "Bank Transfer"),
        );
        // Optional custom order date (ISO string or YYYY-MM-DD)
        const orderDateRaw = body.order_date ? String(body.order_date).trim() : null;
        const orderDate = orderDateRaw ? new Date(orderDateRaw) : null;

        if (!shippingName) return errorResponse("Customer name is required", 400);
        if (!shippingPhone) return errorResponse("WhatsApp number is required", 400);
        if (!shippingAddress) return errorResponse("Shipping address is required", 400);
        if (!shippingRegional) return errorResponse("City or regional is required", 400);

        if (shippingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingEmail)) {
            return errorResponse("Customer email is invalid", 400);
        }

        const normalizedItems = normalizeManualOrderItems(body.items);
        if (!normalizedItems.length) {
            return errorResponse("Order must include at least one product", 400);
        }

        const productIds = Array.from(
            new Set(normalizedItems.map((item) => item.product_id)),
        );
        const { data: products, error: productsError } = await supabaseAdmin
            .from("products")
            .select("id, name, is_active, cost_of_goods")
            .in("id", productIds);

        if (productsError) {
            return errorResponse("Failed to validate selected products", 500);
        }

        if (!products || products.length !== productIds.length) {
            return errorResponse("Some selected products were not found", 400);
        }

        const productLookup = new Map(
            products.map((product: any) => [product.id, product]),
        );

        for (const item of normalizedItems) {
            const product = productLookup.get(item.product_id);
            if (!product) {
                return errorResponse("Some selected products were not found", 400);
            }
            if (product.is_active === false) {
                return errorResponse(
                    `${product.name || "Selected product"} is inactive`,
                    400,
                );
            }
        }

        const subtotal = normalizedItems.reduce(
            (sum, item) => sum + item.quantity * item.price_at_purchase,
            0,
        );
        const totalPrice = Math.max(0, subtotal - manualDiscountAmount - (orderSource === "shopee" ? marketplaceFee : 0));
        const transactionCode =
            String(body.transaction_code || "").trim() ||
            manualReference ||
            `${orderSource === "shopee" ? "SHOPEE" : "WA"}-${Date.now()}`;

        const orderPayload: Record<string, any> = {
            user_id: null,
            is_guest: true,
            total_price: totalPrice,
            subtotal,
            marketplace_fee: orderSource === "shopee" ? marketplaceFee : 0,
            shipment_type: shipmentType,
            shipping_fee: shipmentFee,
            shipping_address: shippingAddress,
            shipping_regional: shippingRegional,
            shipping_name: shippingName,
            shipping_phone: shippingPhone,
            shipping_zip: shippingZip || null,
            shipping_email: shippingEmail || null,
            customer_username: customerUsername || null,
            note: note || null,
            voucher_code: null,
            voucher_id: null,
            voucher_discount_amount: manualDiscountAmount,
            status,
            order_source: orderSource,
            manual_channel: manualChannel,
            manual_reference: manualReference || transactionCode,
        };

        if (orderDate && !isNaN(orderDate.getTime())) {
            orderPayload.created_at = orderDate.toISOString();
        }

        let { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .insert(orderPayload)
            .select()
            .single();

        if (orderError && isMissingCustomerUsernameColumn(orderError)) {
            const retry = await supabaseAdmin
                .from("orders")
                .insert(withoutCustomerUsername(orderPayload))
                .select()
                .single();

            order = retry.data;
            orderError = retry.error;
        }

        if (orderError) return errorResponse("Failed to create manual order", 400);

        const { error: itemsError } = await supabaseAdmin
            .from("order_items")
            .insert(
                normalizedItems.map((item) => ({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_at_purchase: item.price_at_purchase,
                    cogs_at_purchase: Number(
                        productLookup.get(item.product_id)?.cost_of_goods || 0,
                    ),
                })),
            );

        if (itemsError) {
            await cleanupFailedManualOrder(order.id);
            return errorResponse("Failed to create order items", 400);
        }

        const { error: paymentError } = await supabaseAdmin.from("payments").insert({
            order_id: order.id,
            receipt_url: "",
            transaction_code: transactionCode,
            sender_name: shippingName,
            status: "pending",
            payment_type: paymentType,
        });

        if (paymentError) {
            await cleanupFailedManualOrder(order.id);
            return errorResponse("Failed to create payment record", 400);
        }

        try {
            await syncShipmentExpenseForOrder({
                orderId: order.id,
                orderSource,
                shippingFee: shipmentFee,
                shipmentType,
                shippingName,
                createdAt: orderPayload.created_at || order.created_at,
            });
        } catch (shipmentExpenseError: any) {
            await cleanupFailedManualOrder(order.id);
            return errorResponse(
                shipmentExpenseError.message || "Failed to create shipment expense",
                400,
            );
        }

        try {
            await deductOrderInventory(order.id);
        } catch (inventoryError: any) {
            await cleanupFailedManualOrder(order.id);
            return errorResponse(
                inventoryError.message || "Failed to deduct inventory",
                400,
            );
        }

        const { data: createdOrder, error: loadError } = await supabaseAdmin
            .from("orders")
            .select(ADMIN_ORDER_DETAIL_SELECT)
            .eq("id", order.id)
            .single();

        if (loadError || !createdOrder) {
            return successResponse(
                {
                    id: order.id,
                    status: order.status,
                    created_at: order.created_at,
                    total_price: order.total_price,
                },
                "Manual order created",
                201,
            );
        }

        return successResponse(createdOrder, "Manual order created", 201);
    } catch (err: any) {
        return errorResponse("Failed to create manual order", 500);
    }
}
