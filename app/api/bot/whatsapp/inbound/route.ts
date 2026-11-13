import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { BOT_LEAD_SELECT, getJakartaDate } from "@/lib/discord-bot-data";
import {
  createLeadFromExistingCustomer,
  describeExistingCustomer,
  findExistingCustomer,
} from "@/lib/discord-bot-leads";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  WHATSAPP_MIGRATION_MESSAGE,
  readWhatsappListenerJson,
  whatsappPhoneFrom,
} from "@/lib/whatsapp-listener-auth";

// One WhatsApp message seen by the listener (whatsapp-listener/ on the VPS).
//   * number on the ignore list (!ignorewa): nothing is saved;
//   * number that is already a lead: the message is saved for the later chat
//     analysis;
//   * new number writing in: a lead is made (origin from the ad / Instagram
//     info in the message, otherwise "unknown"; status warm until the chat is
//     analysed), and the listener posts it to Discord;
//   * number that ordered before the bot: the lead is made from the old data,
//     like !invoice does;
//   * a message the CS sends to a number that is not a lead: ignored (only
//     incoming chats start a lead).
// The same message sent twice (listener retry) is saved once and answered
// with action "duplicate", so Discord gets one card.

const MESSAGE_TYPES = ["text", "image", "video", "audio", "document", "sticker", "location", "contact", "other"];
const MESSAGE_ID_PATTERN = /^[A-Za-z0-9._:-]{4,128}$/;
const LISTENER_USERNAME = "wa-bot";
// source_message_id tells whether this very message made the lead (the
// listener only posts a Discord card then); BOT_LEAD_SELECT leaves it out.
const INBOUND_LEAD_SELECT = `${BOT_LEAD_SELECT}, source_message_id`;

const clip = (value: unknown, max: number) => {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max).trim() : text;
};

function leadName(pushName: unknown, phone: string) {
  const name = clip(pushName, 160);
  // A profile name made only of emoji or symbols is not useful as a name.
  return /[\p{L}\p{N}]/u.test(name) ? name : `WA ${phone.slice(-4)}`;
}

function leadOrigin(input: { isAd: boolean; entryApp: string }) {
  if (input.isAd) return "ads";
  if (input.entryApp === "instagram") return "instagram";
  return "unknown";
}

function leadNotes(input: { isAd: boolean; adTitle: string; entryApp: string; entrySource: string }) {
  if (input.isAd) {
    return `Dibuat otomatis dari chat WhatsApp masuk lewat iklan${input.adTitle ? `: ${input.adTitle}` : ""}.`;
  }
  const entry = [input.entryApp, input.entrySource].filter(Boolean).join(" / ");
  return `Dibuat otomatis dari chat WhatsApp masuk${entry ? ` (sumber: ${entry})` : ""}. Isi origin lewat !updateleads.`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await readWhatsappListenerJson(req);
    if (auth.response) return auth.response;
    const body = auth.body!;

    const waMessageId = String(body.wa_message_id || "").trim();
    if (!MESSAGE_ID_PATTERN.test(waMessageId)) return errorResponse("wa_message_id tidak valid", 400);
    const phone = whatsappPhoneFrom(body.phone);
    if (!phone) return errorResponse("Nomor WhatsApp tidak valid", 400);
    const direction = body.direction === "out" ? "out" : body.direction === "in" ? "in" : null;
    if (!direction) return errorResponse("direction harus in atau out", 400);
    const messageType = MESSAGE_TYPES.includes(String(body.message_type)) ? String(body.message_type) : "other";
    const sentAt = new Date(String(body.sent_at || ""));
    if (Number.isNaN(sentAt.getTime())) return errorResponse("sent_at tidak valid", 400);
    const text = String(body.text ?? "").trim().slice(0, 4000) || null;
    const isAd = body.is_ad === true;
    const adTitle = clip(body.ad_title, 120);
    const entryApp = clip(body.entry_app, 40).toLowerCase();
    const entrySource = clip(body.entry_source, 60);
    const sourceMessageId = `wa:${waMessageId}`;

    const { data: ignored, error: ignoredError } = await supabaseAdmin
      .from("whatsapp_ignored_numbers")
      .select("phone")
      .eq("phone", phone)
      .maybeSingle();
    if (ignoredError) {
      return errorResponse(WHATSAPP_MIGRATION_MESSAGE, 503);
    }
    if (ignored) return successResponse({ action: "ignored" }, "Nomor diabaikan");

    let { data: lead } = await supabaseAdmin
      .from("leads")
      .select(INBOUND_LEAD_SELECT)
      .eq("whatsapp_phone", phone)
      .maybeSingle();
    let existingCustomer: string | null = null;
    let createdNow = false;

    if (!lead) {
      if (direction === "out") return successResponse({ action: "skipped" }, "Bukan lead");

      const old = await findExistingCustomer(phone);
      if (old) {
        const created = await createLeadFromExistingCustomer(
          old,
          { userId: null, username: LISTENER_USERNAME, messageId: sourceMessageId },
          { source: "chat WhatsApp", status: "warm" },
        );
        if (created.error !== undefined) return errorResponse(created.error, created.status);
        lead = created.lead as any;
        createdNow = created.created;
        existingCustomer = describeExistingCustomer(old);
      } else {
        const today = getJakartaDate();
        const chatDate = getJakartaDate(sentAt);
        const origin = leadOrigin({ isAd, entryApp });
        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert({
            whatsapp_phone: phone,
            full_name: leadName(body.push_name, phone),
            origin,
            // Until the chat is analysed.
            status: "warm",
            chat_date: chatDate > today ? today : chatDate,
            notes: leadNotes({ isAd, adTitle, entryApp, entrySource }),
            is_customer: false,
            discord_user_id: null,
            discord_username: LISTENER_USERNAME,
            source_message_id: sourceMessageId,
          })
          .select(INBOUND_LEAD_SELECT)
          .single();
        if (error?.code === "23505") {
          // Saved a moment ago (retry, or someone ran !newleads): use it.
          ({ data: lead } = await supabaseAdmin
            .from("leads")
            .select(INBOUND_LEAD_SELECT)
            .eq("whatsapp_phone", phone)
            .maybeSingle());
        } else if (error?.code === "22P02" && origin === "unknown") {
          return errorResponse(
            "Database belum kenal origin unknown. Jalankan migration 20261111090000_add_whatsapp_listener.sql di Supabase.",
            503,
          );
        } else if (error || !data) {
          return errorResponse("Gagal membuat lead dari chat WhatsApp", 500);
        } else {
          lead = data as any;
          createdNow = true;
        }
      }
      if (!lead) return errorResponse("Gagal membuat lead dari chat WhatsApp", 500);
    }

    const leadRow = lead as Record<string, any>;
    const { data: inserted, error: messageError } = await supabaseAdmin
      .from("whatsapp_messages")
      .upsert(
        {
          wa_message_id: waMessageId,
          chat_phone: phone,
          lead_id: leadRow.id,
          direction,
          message_type: messageType,
          body: text,
          is_ad: isAd,
          sent_at: sentAt.toISOString(),
        },
        { onConflict: "chat_phone,wa_message_id", ignoreDuplicates: true },
      )
      .select("id");
    if (messageError) return errorResponse("Gagal menyimpan pesan WhatsApp", 500);
    const duplicate = !inserted || inserted.length === 0;

    // A lead made by this very message: the listener posts it to Discord.
    // After a retry where the message was already saved, the card was too.
    const createdHere = createdNow || leadRow.source_message_id === sourceMessageId;
    const action = duplicate
      ? "duplicate"
      : createdHere
        ? existingCustomer
          ? "lead_created_existing_customer"
          : "lead_created"
        : "stored";

    return successResponse(
      {
        action,
        lead: createdHere
          ? {
              whatsapp_phone: leadRow.whatsapp_phone,
              full_name: leadRow.full_name,
              origin: leadRow.origin,
              status: leadRow.status,
              chat_date: leadRow.chat_date,
              is_customer: leadRow.is_customer,
            }
          : { whatsapp_phone: leadRow.whatsapp_phone },
        existing_customer: existingCustomer,
      },
      action === "stored" ? "Pesan disimpan" : action === "duplicate" ? "Pesan sudah tersimpan" : "Lead dibuat dari chat WhatsApp",
      action.startsWith("lead_created") ? 201 : 200,
    );
  } catch {
    return errorResponse("Gagal memproses pesan WhatsApp", 500);
  }
}
