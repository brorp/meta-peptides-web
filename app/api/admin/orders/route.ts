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

const ORDER_STATUSES = [
    "pending_review",
    "processing",
    "completed",
    "cancelled",
];

const ORDER_SOURCES = ["manual_whatsapp", "shopee"];

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

    await supabaseAdmin.from("payments").delete().eq("order_id", orderId);
    await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);
    await supabaseAdmin.from("orders").delete().eq("id", orderId);
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status") || "";
        const keyword = searchParams.get("keyword") || "";

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAdmin
            .from("orders")
            .select("*, order_items(*, products(name, image_url)), payments(*)", {
                count: "exact",
            });

        if (status) {
            query = query.eq("status", status);
        }

        if (keyword) {
            query = query.or(
                `shipping_name.ilike.%${keyword}%,shipping_email.ilike.%${keyword}%,customer_username.ilike.%${keyword}%,manual_reference.ilike.%${keyword}%,id.ilike.%${keyword}%`,
            );
        }

        let { data, error, count } = await query
            .order("created_at", { ascending: false })
            .range(from, to);

        if (error && keyword && isMissingCustomerUsernameColumn(error)) {
            let fallbackQuery = supabaseAdmin
                .from("orders")
                .select("*, order_items(*, products(name, image_url)), payments(*)", {
                    count: "exact",
                });

            if (status) {
                fallbackQuery = fallbackQuery.eq("status", status);
            }

            fallbackQuery = fallbackQuery.or(
                `shipping_name.ilike.%${keyword}%,shipping_email.ilike.%${keyword}%,manual_reference.ilike.%${keyword}%,id.ilike.%${keyword}%`,
            );

            const fallback = await fallbackQuery
                .order("created_at", { ascending: false })
                .range(from, to);

            data = fallback.data;
            error = fallback.error;
            count = fallback.count;
        }

        if (error) return errorResponse(error.message, 400);

        return paginateResponse(
            data,
            page,
            limit,
            count || 0,
            "Orders retrieved",
        );
    } catch (err: any) {
        return errorResponse(err.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
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
            .select("id, name, is_active")
            .in("id", productIds);

        if (productsError) {
            return errorResponse(
                `Failed to validate products: ${productsError.message}`,
                500,
            );
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

        if (orderError) return errorResponse(orderError.message, 400);

        const { error: itemsError } = await supabaseAdmin
            .from("order_items")
            .insert(
                normalizedItems.map((item) => ({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    price_at_purchase: item.price_at_purchase,
                })),
            );

        if (itemsError) {
            await cleanupFailedManualOrder(order.id);
            return errorResponse(itemsError.message, 400);
        }

        const { error: paymentError } = await supabaseAdmin.from("payments").insert({
            order_id: order.id,
            receipt_url: "",
            transaction_code: transactionCode,
            sender_name: shippingName,
            status: "pending",
        });

        if (paymentError) {
            await cleanupFailedManualOrder(order.id);
            return errorResponse(paymentError.message, 400);
        }

        const { data: createdOrder, error: loadError } = await supabaseAdmin
            .from("orders")
            .select("*, order_items(*, products(name, image_url)), payments(*)")
            .eq("id", order.id)
            .single();

        if (loadError || !createdOrder) {
            return successResponse(order, "Manual order created", 201);
        }

        return successResponse(createdOrder, "Manual order created", 201);
    } catch (err: any) {
        return errorResponse(err.message || "Failed to create manual order", 500);
    }
}
