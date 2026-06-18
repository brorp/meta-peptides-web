import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  matchShopeeLabelProduct,
  parseShopeeLabelPdf,
  ShopeeLabelProductRecord,
} from "@/lib/shopee-label-pdf";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_PDF_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Please upload a Shopee shipping label PDF.", 400);
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return errorResponse("Only PDF files are supported.", 400);
    }

    if (file.size > MAX_PDF_SIZE) {
      return errorResponse("PDF is too large. Maximum size is 5MB.", 400);
    }

    const parsed = await parseShopeeLabelPdf(await file.arrayBuffer());
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, label, volume, price")
      .eq("is_active", true);

    if (productsError) {
      return errorResponse(
        `Failed to match PDF products: ${productsError.message}`,
        400,
      );
    }

    const matchedItems = parsed.items.map((item) => {
      const matchedProduct = matchShopeeLabelProduct(
        item.name,
        (products || []) as ShopeeLabelProductRecord[],
      );

      return {
        raw_name: item.name,
        quantity: item.quantity,
        product_id: matchedProduct?.id || null,
        product_name: matchedProduct?.name || null,
        price_at_purchase: Number(matchedProduct?.price || 0),
      };
    });

    return successResponse(
      {
        shipping_name: parsed.recipientName,
        shipping_phone: "-",
        shipping_address: parsed.fullAddress,
        shipping_regional: parsed.city,
        manual_reference: parsed.orderNumber,
        items: matchedItems,
      },
      "Shopee label parsed",
    );
  } catch (err: any) {
    return errorResponse(
      err.message || "Failed to read the Shopee shipping label PDF.",
      400,
    );
  }
}
