import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { renderInvoicePdfBuffer } from "@/lib/pdf/generate-invoice";
import { PackingSlipDocument } from "@/lib/pdf/generate-packing-slip";
import { requireAdminApiSession } from "@/lib/admin-api";

const ADMIN_ORDER_PDF_SELECT =
    "id, status, created_at, total_price, subtotal, voucher_code, voucher_discount_amount, marketplace_fee, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_regional, shipping_zip, customer_username, note, tracking_number, order_source, manual_reference, shipping_fee, shipment_type, order_items(id, product_id, quantity, price_at_purchase, products(name, label, volume, image_url, slug)), payments(id, transaction_code, payment_type, status)";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireAdminApiSession();
        if (auth.response) return auth.response;

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");

        if (!type || !["invoice", "packing-slip"].includes(type)) {
            return NextResponse.json(
                { success: false, message: "Invalid PDF type. Use 'invoice' or 'packing-slip'" },
                { status: 400 },
            );
        }

        // Fetch order with items and payments
        const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select(ADMIN_ORDER_PDF_SELECT)
            .eq("id", id)
            .single();

        if (error || !order) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 },
            );
        }

        // Generate PDF
        let pdfBuffer: Buffer;

        if (type === "invoice") {
            pdfBuffer = await renderInvoicePdfBuffer(order);
        } else {
            pdfBuffer = await renderToBuffer(
                React.createElement(PackingSlipDocument, { order }) as any,
            );
        }

        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${type}-${id.slice(0, 8)}.pdf"`,
            },
        });
    } catch (err: any) {
        console.error("PDF generation error:", err);
        return NextResponse.json(
            { success: false, message: "Failed to generate PDF" },
            { status: 500 },
        );
    }
}
