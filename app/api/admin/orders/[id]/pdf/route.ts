import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { renderInvoicePdfBuffer } from "@/lib/pdf/generate-invoice";
import { PackingSlipDocument } from "@/lib/pdf/generate-packing-slip";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
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
            .select("*, order_items(*, products(name, label, volume, image_url, slug)), payments(*)")
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
            { success: false, message: err.message || "Failed to generate PDF" },
            { status: 500 },
        );
    }
}
