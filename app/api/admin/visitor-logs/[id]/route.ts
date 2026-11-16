import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApiSession } from "@/lib/admin-api";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  VisitorLogError,
  getVisitorIp,
  enrichVisitorIp,
} from "@/lib/visitor-ip-logs";
export const maxDuration = 30;
const failure = (error: unknown) =>
  errorResponse(
    error instanceof VisitorLogError
      ? error.message
      : "Gagal memproses detail IP.",
    error instanceof VisitorLogError ? error.status : 500,
  );
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(["root"]);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return errorResponse("ID tidak valid.", 400);
  try {
    return successResponse(await getVisitorIp(id), "Detail Visitor IP");
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiSession(["root"]);
  if (auth.response) return auth.response;
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return errorResponse("Origin tidak diizinkan.", 403);
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return errorResponse("ID tidak valid.", 400);
  try {
    await getVisitorIp(id);
    const result = await enrichVisitorIp(id);
    return result.status === "cooldown"
      ? errorResponse(
          "Lookup IP ini dibatasi satu kali per 10 menit. Data tersimpan tetap tersedia.",
          429,
        )
      : successResponse(result, "Lookup selesai");
  } catch (error) {
    return failure(error);
  }
}
