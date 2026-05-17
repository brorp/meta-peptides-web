import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";

const normalizeText = (value: unknown) => String(value || "").trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = normalizeText(body.full_name);
    const email = normalizeText(body.email).toLowerCase();
    const whatsappNumber = normalizeText(body.whatsapp_number);
    const businessName = normalizeText(body.business_name);
    const businessType = normalizeText(body.business_type);
    const city = normalizeText(body.city);
    const country = normalizeText(body.country) || "Indonesia";
    const socialLink = normalizeText(body.social_link);
    const notes = normalizeText(body.notes);
    const estimatedMonthlyOrders =
      body.estimated_monthly_orders === "" ||
      body.estimated_monthly_orders === null ||
      body.estimated_monthly_orders === undefined
        ? null
        : Number(body.estimated_monthly_orders);

    if (!fullName) return errorResponse("Nama lengkap wajib diisi", 400);
    if (!email) return errorResponse("Email wajib diisi", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Format email tidak valid", 400);
    }
    if (!whatsappNumber) return errorResponse("Nomor WhatsApp wajib diisi", 400);
    if (!businessName) return errorResponse("Nama bisnis wajib diisi", 400);
    if (!city) return errorResponse("Kota domisili wajib diisi", 400);
    if (
      estimatedMonthlyOrders !== null &&
      (!Number.isFinite(estimatedMonthlyOrders) || estimatedMonthlyOrders < 0)
    ) {
      return errorResponse("Estimasi order bulanan tidak valid", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("reseller_applications")
      .insert({
        full_name: fullName,
        email,
        whatsapp_number: whatsappNumber,
        business_name: businessName,
        business_type: businessType || null,
        city,
        country,
        social_link: socialLink || null,
        estimated_monthly_orders: estimatedMonthlyOrders,
        notes: notes || null,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("[Reseller] Submission insert failed:", error);
      return errorResponse("Gagal menyimpan pendaftaran reseller", 500);
    }

    return successResponse(
      data,
      "Pendaftaran reseller berhasil dikirim",
      201,
    );
  } catch (err: any) {
    console.error("[Reseller] Submission error:", err);
    return errorResponse(err.message || "Terjadi kesalahan server", 500);
  }
}
