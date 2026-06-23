import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { normalizePhone } from "@/lib/customer-sync";
import { supabaseAdmin } from "@/lib/supabase-server";

const normalizeText = (value: unknown) => String(value || "").trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Quietly accept bot submissions without writing them to the database.
    if (normalizeText(body.website)) {
      return successResponse(null, "Consultation received", 201);
    }

    const fullName = normalizeText(body.name);
    const whatsappPhone = normalizePhone(body.whatsapp);
    const email = normalizeText(body.email).toLowerCase();
    const domicile = normalizeText(body.domicile);
    const age = normalizeText(body.age);
    const gender = normalizeText(body.gender);
    const goals = normalizeText(body.goals);
    const concern = normalizeText(body.concern);

    if (!fullName) return errorResponse("Name is required", 400);
    if (!whatsappPhone) return errorResponse("WhatsApp number is required", 400);
    if (!age) return errorResponse("Age range is required", 400);
    if (!gender) return errorResponse("Gender is required", 400);
    if (!domicile) return errorResponse("Domicile is required", 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Email is invalid", 400);
    }

    const campaign = {
      source: normalizeText(body.utm_source),
      medium: normalizeText(body.utm_medium),
      campaign: normalizeText(body.utm_campaign),
      content: normalizeText(body.utm_content),
      term: normalizeText(body.utm_term),
    };
    const submittedAt = new Date().toISOString();
    const consultationNote = [
      `[Free Consultation ${submittedAt}]`,
      `Age: ${age}`,
      `Gender: ${gender}`,
      goals ? `Goals: ${goals}` : null,
      concern ? `Concern: ${concern}` : null,
      campaign.source ? `UTM Source: ${campaign.source}` : null,
      campaign.medium ? `UTM Medium: ${campaign.medium}` : null,
      campaign.campaign ? `UTM Campaign: ${campaign.campaign}` : null,
      campaign.content ? `UTM Content: ${campaign.content}` : null,
      campaign.term ? `UTM Term: ${campaign.term}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("customers")
      .select("id, notes, lead_source")
      .eq("whatsapp_phone", whatsappPhone)
      .maybeSingle();

    if (existingError) return errorResponse(existingError.message, 400);

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("customers")
        .update({
          full_name: fullName,
          email: email || null,
          domicile,
          notes: [existing.notes, consultationNote].filter(Boolean).join("\n\n"),
          updated_at: submittedAt,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (error) return errorResponse(error.message, 400);
      return successResponse(data, "Consultation lead updated");
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert({
        full_name: fullName,
        whatsapp_phone: whatsappPhone,
        email: email || null,
        domicile,
        lead_source: campaign.source ? "meta_ads" : "consultation",
        current_journey: "new_leads",
        journey_updated_at: submittedAt,
        notes: consultationNote,
      })
      .select("id")
      .single();

    if (error) return errorResponse(error.message, 400);

    return successResponse(data, "Consultation lead created", 201);
  } catch (err: any) {
    return errorResponse(err.message || "Failed to submit consultation", 500);
  }
}
