import { NextRequest } from "next/server";
import { requireAdminApiSession } from "@/lib/admin-api";
import { errorResponse, successResponse } from "@/lib/api-response";
import { VisitorLogError, listVisitorIps } from "@/lib/visitor-ip-logs";
export async function GET(request: NextRequest) {
  const auth = await requireAdminApiSession(["root"]);
  if (auth.response) return auth.response;
  try {
    return successResponse(
      await listVisitorIps(new URL(request.url).searchParams),
      "Visitor IP logs",
    );
  } catch (error) {
    return errorResponse(
      error instanceof VisitorLogError
        ? error.message
        : "Gagal memuat Visitor Logs.",
      error instanceof VisitorLogError ? error.status : 500,
    );
  }
}
