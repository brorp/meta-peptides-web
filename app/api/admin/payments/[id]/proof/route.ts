import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/admin-api";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminApiSession();
    if (auth.response) return auth.response;

    const { id } = await params;
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("proof_storage_path")
      .eq("id", id)
      .single();

    if (error || !payment?.proof_storage_path) {
      return errorResponse("Payment proof not found", 404);
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("payment-proofs")
      .createSignedUrl(payment.proof_storage_path, 60);

    if (signedError || !signed?.signedUrl) {
      return errorResponse("Failed to open payment proof", 500);
    }

    return NextResponse.redirect(signed.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return errorResponse("Failed to open payment proof", 500);
  }
}
