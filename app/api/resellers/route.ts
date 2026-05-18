import { errorResponse, successResponse } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabase-server";

const normalizeText = (value: unknown) => String(value || "").trim();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = normalizeText(body.full_name);
    const email = normalizeText(body.email).toLowerCase();
    const whatsappNumber = normalizeText(body.whatsapp_number);
    const occupation = normalizeText(body.occupation);
    const businessName = normalizeText(body.business_name);
    const businessType = normalizeText(body.business_type);
    const city = normalizeText(body.city);
    const country = normalizeText(body.country) || "Indonesia";
    const socialLink = normalizeText(body.social_link);
    const notes = normalizeText(body.notes);
    const acceptedTerms = body.accepted_terms === true;
    const estimatedMonthlyOrders =
      body.estimated_monthly_orders === "" ||
      body.estimated_monthly_orders === null ||
      body.estimated_monthly_orders === undefined
        ? null
        : Number(body.estimated_monthly_orders);

    if (!fullName) return errorResponse("Full name is required", 400);
    if (!email) return errorResponse("Email is required", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Email format is invalid", 400);
    }
    if (!whatsappNumber) return errorResponse("WhatsApp number is required", 400);
    if (!occupation) return errorResponse("Occupation is required", 400);
    if (!businessName) return errorResponse("Business name is required", 400);
    if (!city) return errorResponse("City is required", 400);
    if (!acceptedTerms) {
      return errorResponse("You must agree to the Terms and Conditions", 400);
    }
    if (
      estimatedMonthlyOrders !== null &&
      (!Number.isFinite(estimatedMonthlyOrders) || estimatedMonthlyOrders < 0)
    ) {
      return errorResponse("Estimated monthly orders is invalid", 400);
    }

    const { data, error } = await supabaseAdmin
      .from("reseller_applications")
      .insert({
        full_name: fullName,
        email,
        whatsapp_number: whatsappNumber,
        occupation,
        business_name: businessName,
        business_type: businessType || null,
        city,
        country,
        social_link: socialLink || null,
        estimated_monthly_orders: estimatedMonthlyOrders,
        notes: notes || null,
        accepted_terms: acceptedTerms,
        status: "new",
      })
      .select()
      .single();

    if (error) {
      console.error("[Reseller] Submission insert failed:", error);
      return errorResponse("Failed to save reseller application", 500);
    }

    return successResponse(
      data,
      "Reseller application submitted",
      201,
    );
  } catch (err: any) {
    console.error("[Reseller] Submission error:", err);
    return errorResponse(err.message || "Server error", 500);
  }
}
