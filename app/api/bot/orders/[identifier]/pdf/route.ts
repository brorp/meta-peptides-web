import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { authenticateDiscordBotRequest } from "@/lib/discord-bot-auth";
import { resolveOrderIdentifier } from "@/lib/discord-bot-data";
import { loadBotOrderDetail } from "@/lib/discord-bot-orders";
import { PackingSlipDocument } from "@/lib/pdf/generate-packing-slip";
import { renderInvoicePdfBuffer } from "@/lib/pdf/generate-invoice";

// Same invoice / packing slip PDFs as the panel's download buttons.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const auth = await authenticateDiscordBotRequest(req, "", {
      maxRequestsPerMinute: 30,
    });
    if (auth.response) return auth.response;

    const { identifier } = await params;
    const type = new URL(req.url).searchParams.get("type") || "invoice";
    if (!["invoice", "packing-slip"].includes(type)) {
      return errorResponse("Tipe PDF harus invoice atau packing-slip", 400);
    }

    const orderResult = await resolveOrderIdentifier(decodeURIComponent(identifier));
    if (!orderResult.data) return errorResponse(orderResult.error, 404);

    const detailResult = await loadBotOrderDetail(orderResult.data.id);
    if (!detailResult.data) return errorResponse("Invoice tidak ditemukan", 404);

    const pdfBuffer =
      type === "invoice"
        ? await renderInvoicePdfBuffer(detailResult.data)
        : await renderToBuffer(
            React.createElement(PackingSlipDocument, {
              order: detailResult.data,
            }) as any,
          );
    const reference =
      detailResult.data.invoice_number || detailResult.data.id.slice(0, 8).toUpperCase();

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${type}-${reference}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return errorResponse("Gagal membuat PDF", 500);
  }
}
