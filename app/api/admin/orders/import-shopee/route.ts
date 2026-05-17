import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { importShopeeOrders } from "@/lib/shopee-import";

export const runtime = "nodejs";

const parseBoolean = (value: FormDataEntryValue | string | null) =>
    value === "true" || value === "1" || value === "yes";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const formData = await req.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return errorResponse("Please upload a Shopee XLSX file.", 400);
        }

        const filename = file.name.toLowerCase();
        if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
            return errorResponse("Shopee import only accepts XLSX or XLS files.", 400);
        }

        const dryRun =
            parseBoolean(searchParams.get("dry_run")) ||
            parseBoolean(formData.get("dry_run"));
        const limitValue =
            searchParams.get("limit") || String(formData.get("limit") || "");
        const limit = Number(limitValue);

        const result = await importShopeeOrders(await file.arrayBuffer(), {
            dryRun,
            limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        });

        if (result.errors.length && !result.orders.length) {
            return errorResponse("Shopee import failed", 400, result);
        }

        return successResponse(
            result,
            dryRun ? "Shopee import dry run completed" : "Shopee orders imported",
        );
    } catch (err: any) {
        return errorResponse(err.message || "Failed to import Shopee orders", 500);
    }
}
