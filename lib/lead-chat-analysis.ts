import Anthropic from "@anthropic-ai/sdk";
import { BOT_LEAD_SELECT, getJakartaDate } from "@/lib/discord-bot-data";
import { matchProductVisibleFirst } from "@/lib/discord-bot-product-match";
import { getProductDisplayName, loadBotProducts } from "@/lib/discord-bot-products";
import {
  ANALYSIS_NOT_CONFIGURED,
  ANALYSIS_SYSTEM_PROMPT,
  analysisOutputSchema,
  buildTranscript,
  catalogBlock,
  changedFields,
  freellmapiSystemPrompt,
  parseAnalysisText,
  plannedLeadUpdate,
  readAnalysisConfig,
  type AnalysisConfig,
  type ChatMessage,
  type SuggestionValues,
} from "@/lib/lead-chat-analysis-core";
import { supabaseAdmin } from "@/lib/supabase-server";

// Reads a lead's WhatsApp chat (saved by the WhatsApp listener) and asks an
// AI for status, rejection, interest, goal and domicile (migration
// 20261111110000). Suggestions only, unless LEAD_ANALYSIS_AUTO_APPLY=status.
//
// Env (Vercel), see readAnalysisConfig in lead-chat-analysis-core.ts:
// - FREELLMAPI_BASE_URL + FREELLMAPI_API_KEY (optional FREELLMAPI_MODEL,
//   default auto:smart): a self-hosted freellmapi router with free models.
//   Takes precedence over ANTHROPIC_API_KEY.
// - otherwise ANTHROPIC_API_KEY; optional LEAD_ANALYSIS_MODEL (default
//   claude-opus-5-5), LEAD_ANALYSIS_EFFORT (default low).

export const ANALYSIS_MIGRATION_MESSAGE =
  "Database belum di-update untuk analisa chat. Jalankan migration 20261111110000_add_lead_chat_analysis.sql di Supabase.";

export function analysisConfig(env: Record<string, string | undefined> = process.env) {
  return readAnalysisConfig(env).config;
}
// Why analysis is off (missing or invalid env), or null when it is set up.
export function analysisSetupError(env: Record<string, string | undefined> = process.env) {
  return readAnalysisConfig(env).error;
}

let claudeClient: Anthropic | null = null;
let routerClient: { key: string; client: Anthropic } | null = null;
function clientFor(config: AnalysisConfig) {
  if (config.provider === "anthropic") return (claudeClient ||= new Anthropic({ timeout: 90_000, maxRetries: 2 }));
  const key = `${config.baseURL}\n${config.apiKey}`;
  if (routerClient?.key !== key) {
    routerClient = {
      key,
      // The key is passed in code, so the SDK never reads (or sends)
      // ANTHROPIC_API_KEY to the router. No SDK retries: the router already
      // fails over between free providers, and its 429 "quota_exceeded" has a
      // Retry-After of the next month, which the SDK would wait out.
      client: new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: 75_000,
        maxRetries: 0,
        // No prompt compression (it would rewrite the chat) and no response
        // cache (the same chat may need a fresh answer).
        defaultHeaders: { "X-FreeLLM-Compress": "off", "X-FreeLLM-Cache": "off" },
      }),
    };
  }
  return routerClient.client;
}

// Haiku has no server-side fallback (a list returns 400); the others re-run a
// declined request on Anthropic's recommended model inside the same call.
const supportsFallback = (model: string) => !/^claude-haiku/.test(model);

const LEAD_FIELDS = `${BOT_LEAD_SELECT}, ai_analyzed_at, ai_analyzed_through, ai_applied_at`;

type Catalog = { names: string[]; products: Awaited<ReturnType<typeof loadBotProducts>> };
async function loadCatalog(): Promise<Catalog> {
  const products = await loadBotProducts({ includeInactive: true });
  const names = Array.from(new Set(products.map((product) => getProductDisplayName(product)))).sort();
  return { names, products };
}

export type AnalysisResult =
  | { result: "suggested" | "no_change" | "not_enough_info"; lead: Record<string, any>; suggestion: Record<string, any> | null; applied: string[] }
  | { result: "no_messages" | "refusal" | "skipped"; lead: Record<string, any> | null; reason?: string }
  | { result: "error"; lead: Record<string, any> | null; error: string; fatal?: boolean };

// The router's own error text ("No model available"), not the SDK's
// "503 {json}".
const routerMessage = (error: InstanceType<typeof Anthropic.APIError>) =>
  String((error.error as { error?: { message?: string } } | undefined)?.error?.message || error.message).slice(0, 160);

function describeApiError(error: unknown, provider: AnalysisConfig["provider"]) {
  if (provider === "freellmapi") {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return { error: "FREELLMAPI_API_KEY ditolak router. Cek unified key di dashboard freellmapi dan env Vercel.", fatal: true };
    }
    if (error instanceof Anthropic.RateLimitError) return { error: "Kuota gratis semua provider di freellmapi habis, dicoba lagi di jadwal berikutnya.", fatal: true };
    if (error instanceof Anthropic.NotFoundError) return { error: "Alamat /v1/messages tidak ditemukan di FREELLMAPI_BASE_URL. Cek URL dan reverse proxy di VPS.", fatal: true };
    if (error instanceof Anthropic.BadRequestError) return { error: `freellmapi menolak request: ${routerMessage(error)}`, fatal: true };
    if (error instanceof Anthropic.APIConnectionTimeoutError) return { error: "freellmapi tidak menjawab (timeout)", fatal: false };
    if (error instanceof Anthropic.APIConnectionError) {
      return { error: "freellmapi tidak bisa dihubungi dari Vercel. Cek container di VPS, HTTPS, dan FREELLMAPI_BASE_URL.", fatal: true };
    }
    if (error instanceof Anthropic.APIError) {
      // 503/529: no free model is available right now.
      const status = Number(error.status) || 0;
      return { error: `freellmapi error ${status || "?"}: ${routerMessage(error)}`, fatal: status === 503 || status === 529 };
    }
    return { error: "freellmapi tidak bisa dihubungi", fatal: false };
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return { error: "ANTHROPIC_API_KEY ditolak (salah atau tidak punya akses). Cek env di Vercel.", fatal: true };
  }
  if (error instanceof Anthropic.RateLimitError) return { error: "Batas pemakaian Claude API tercapai, dicoba lagi di jadwal berikutnya.", fatal: true };
  if (error instanceof Anthropic.BadRequestError) return { error: `Claude API menolak request: ${String(error.message).slice(0, 160)}`, fatal: true };
  if (error instanceof Anthropic.APIError) return { error: `Claude API error ${error.status ?? ""}`.trim(), fatal: false };
  return { error: "Claude API tidak bisa dihubungi", fatal: false };
}

type ModelAnswer = {
  stopReason: string | null;
  text: string;
  model: string;
  usage: { input: number; output: number };
};

async function askModel(config: AnalysisConfig, catalog: Catalog, transcript: string): Promise<ModelAnswer> {
  const textOf = (content: Array<{ type: string; text?: string }>) => content.map((block) => (block.type === "text" ? block.text || "" : "")).join("");
  if (config.provider === "freellmapi") {
    const { data, response } = await clientFor(config)
      .messages.create({
        model: config.model,
        max_tokens: 8000,
        system: freellmapiSystemPrompt(catalog.names),
        messages: [{ role: "user", content: transcript }],
      })
      .withResponse();
    // X-Routed-Via: the provider/model that really answered (saved with the
    // suggestion, so it is clear where each chat was sent).
    const routedVia = response.headers.get("x-routed-via");
    return {
      stopReason: data.stop_reason,
      text: textOf(data.content as Array<{ type: string; text?: string }>),
      model: `freellmapi:${(routedVia || config.model).slice(0, 120)}`,
      usage: { input: data.usage?.input_tokens || 0, output: data.usage?.output_tokens || 0 },
    };
  }
  const data = await clientFor(config).beta.messages.create({
    model: config.model,
    max_tokens: 8000,
    ...(supportsFallback(config.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    output_config: { effort: config.effort, format: { type: "json_schema", schema: analysisOutputSchema(catalog.names) } },
    system: [
      { type: "text", text: ANALYSIS_SYSTEM_PROMPT },
      { type: "text", text: catalogBlock(catalog.names), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: transcript }],
  });
  const usage = data.usage;
  return {
    stopReason: data.stop_reason,
    text: textOf(data.content as Array<{ type: string; text?: string }>),
    model: data.model || config.model,
    usage: {
      input: (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0),
      output: usage.output_tokens || 0,
    },
  };
}

/**
 * force: analyse even when there is no new message since the last analysis
 * (!analyze <wa>).
 */
export async function analyzeLead(leadId: string, options: { force?: boolean; catalog?: Catalog } = {}): Promise<AnalysisResult> {
  const { config, error: setupError } = readAnalysisConfig(process.env);
  if (!config) return { result: "error", lead: null, error: setupError || ANALYSIS_NOT_CONFIGURED, fatal: true };

  const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select(LEAD_FIELDS).eq("id", leadId).maybeSingle();
  if (leadError) return { result: "error", lead: null, error: ANALYSIS_MIGRATION_MESSAGE, fatal: true };
  if (!lead) return { result: "skipped", lead: null, reason: "Lead tidak ditemukan" };
  const row = lead as Record<string, any>;

  const { data: recent, error: messagesError } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("direction, message_type, body, sent_at")
    .eq("lead_id", leadId)
    .order("sent_at", { ascending: false })
    .limit(150);
  if (messagesError) return { result: "error", lead: row, error: ANALYSIS_MIGRATION_MESSAGE, fatal: true };
  const messages = ((recent || []) as ChatMessage[]).reverse();
  if (!messages.length || !messages.some((message) => message.direction === "in")) return { result: "no_messages", lead: row };
  const lastMessageAt = messages[messages.length - 1].sent_at;
  if (!options.force && row.ai_analyzed_through && Date.parse(row.ai_analyzed_through) >= Date.parse(lastMessageAt)) {
    return { result: "skipped", lead: row, reason: "Tidak ada chat baru sejak analisa terakhir" };
  }

  const catalog = options.catalog || (await loadCatalog());
  const interest = row.product ? getProductDisplayName(row.product) : row.interest_text || null;
  const transcript = buildTranscript({ full_name: row.full_name, status: row.status, origin: row.origin, interest }, messages, getJakartaDate());

  let answer: ModelAnswer;
  try {
    answer = await askModel(config, catalog, transcript);
  } catch (error) {
    return { result: "error", lead: row, ...describeApiError(error, config.provider) };
  }

  const now = new Date().toISOString();
  const markAnalyzed = () =>
    supabaseAdmin.from("leads").update({ ai_analyzed_at: now, ai_analyzed_through: lastMessageAt }).eq("id", leadId);

  if (answer.stopReason === "refusal") {
    // Marked as analysed so the same chat is not sent again; a new message
    // tries again.
    await markAnalyzed();
    return { result: "refusal", lead: row, reason: "AI menolak menganalisa chat ini" };
  }
  if (answer.stopReason === "max_tokens") return { result: "error", lead: row, error: "Jawaban AI terpotong (max_tokens)" };
  const parsed = parseAnalysisText(answer.text, { lenient: config.provider === "freellmapi" });
  if ("error" in parsed) return { result: "error", lead: row, error: parsed.error as string };
  const output = parsed.output!;

  if (!output.enough_info) {
    await markAnalyzed();
    return { result: "not_enough_info", lead: row, suggestion: null, applied: [] };
  }

  const firstProduct = output.interest_products
    .map((name) => matchProductVisibleFirst(name, catalog.products))
    .find((match) => match.status === "matched");
  const values: SuggestionValues = {
    status: output.status,
    rejection: output.rejection,
    interest_product_id: firstProduct && firstProduct.status === "matched" ? firstProduct.product.id : null,
    interest_text: firstProduct ? null : output.interest_text,
    goal: output.goal,
    domicile: output.domicile,
  };
  const update = plannedLeadUpdate(row as any, values);
  const changes = changedFields(update);

  const { data: suggestion, error: insertError } = await supabaseAdmin
    .from("lead_ai_suggestions")
    .insert({
      lead_id: leadId,
      source: "ai",
      model: answer.model,
      ...values,
      summary: output.summary,
      evidence: output.evidence,
      confidence: output.confidence,
      previous_status: row.status,
      changes,
      messages_through: lastMessageAt,
      message_count: messages.length,
      input_tokens: answer.usage.input,
      output_tokens: answer.usage.output,
    })
    .select("*")
    .single();
  if (insertError || !suggestion) return { result: "error", lead: row, error: ANALYSIS_MIGRATION_MESSAGE, fatal: true };
  await markAnalyzed();

  // Optional: apply the status by itself, only when the AI is sure and the
  // team has not changed the lead by hand since the previous analysis.
  let applied: string[] = [];
  if (config.autoApplyStatus && output.confidence === "high" && (update.status !== undefined || update.rejection !== undefined)) {
    const lastAutomatic = Math.max(Date.parse(row.ai_analyzed_at || 0) || 0, Date.parse(row.ai_applied_at || 0) || 0, Date.parse(row.created_at || 0) || 0);
    if (Date.parse(row.updated_at) <= lastAutomatic + 1000) {
      const statusOnly = Object.fromEntries(Object.entries(update).filter(([key]) => key === "status" || key === "rejection"));
      // The suggestion stays open for !applyai when interest/goal/domicile
      // are still waiting.
      const rest = changes.filter((field) => field !== "status" && field !== "rejection");
      const done = await applyUpdate(leadId, rest.length ? null : suggestion.id, statusOnly, "otomatis");
      if (done) applied = changedFields(statusOnly);
    }
  }

  const interestLabel = firstProduct && firstProduct.status === "matched" ? getProductDisplayName(firstProduct.product) : values.interest_text;
  return { result: changes.length ? "suggested" : "no_change", lead: row, suggestion: { ...suggestion, interest_label: interestLabel }, applied };
}

// Compact form for the Discord bot and the listener's digest.
export function analysisItem(outcome: AnalysisResult) {
  const lead = outcome.lead || {};
  const base = {
    result: outcome.result,
    lead_id: lead.id ?? null,
    whatsapp_phone: lead.whatsapp_phone ?? null,
    full_name: lead.full_name ?? null,
    current_status: lead.status ?? null,
  };
  if (outcome.result === "error") return { ...base, error: outcome.error };
  if (!("suggestion" in outcome) || !outcome.suggestion) return { ...base, reason: "reason" in outcome ? outcome.reason ?? null : null };
  const suggestion = outcome.suggestion;
  return {
    ...base,
    status: suggestion.status,
    rejection: suggestion.rejection,
    interest: suggestion.interest_label ?? null,
    goal: suggestion.goal,
    domicile: suggestion.domicile,
    summary: suggestion.summary,
    evidence: suggestion.evidence,
    confidence: suggestion.confidence,
    changes: suggestion.changes || [],
    applied: outcome.applied,
    input_tokens: suggestion.input_tokens || 0,
    output_tokens: suggestion.output_tokens || 0,
  };
}

async function applyUpdate(leadId: string, suggestionId: string | null, update: Record<string, unknown>, appliedBy: string) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("leads")
    .update({ ...update, updated_at: now, ai_applied_at: now })
    .eq("id", leadId);
  if (error) return false;
  if (suggestionId) await supabaseAdmin.from("lead_ai_suggestions").update({ applied_at: now, applied_by: appliedBy }).eq("id", suggestionId);
  return true;
}

// !applyai: the newest suggestion of the last 7 days that is not applied yet.
export async function applyLatestSuggestion(lead: Record<string, any>, appliedBy: string) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: suggestion, error } = await supabaseAdmin
    .from("lead_ai_suggestions")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("source", "ai")
    .is("applied_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { error: ANALYSIS_MIGRATION_MESSAGE, status: 503 };
  if (!suggestion) return { error: `Belum ada usulan AI yang belum diterapkan untuk ${lead.whatsapp_phone} (7 hari terakhir). Jalankan !analyze ${lead.whatsapp_phone} dulu.`, status: 404 };

  // Recomputed against the lead as it is now (it may have changed since).
  const update = plannedLeadUpdate(lead as any, suggestion as SuggestionValues);
  const changes = changedFields(update);
  if (!changes.length) {
    await supabaseAdmin.from("lead_ai_suggestions").update({ applied_at: new Date().toISOString(), applied_by: appliedBy }).eq("id", suggestion.id);
    return { suggestion, changes, lead };
  }
  if (!(await applyUpdate(lead.id, suggestion.id, update, appliedBy))) return { error: "Gagal menerapkan usulan AI", status: 500 };
  const { data: updated } = await supabaseAdmin.from("leads").select(BOT_LEAD_SELECT).eq("id", lead.id).maybeSingle();
  return { suggestion, changes, lead: updated || lead };
}

// Scheduled run (12.00 and 23.00 WIB, from the WhatsApp listener): the
// ghosting rule, then one batch of leads with new messages, three at a time.
// exclude: leads that already failed earlier in the same run (not retried
// until the next run).
export async function analyzePendingLeads({ limit = 8, concurrency = 3, ghosting = true, exclude = [] as string[] } = {}) {
  const { config, error: setupError } = readAnalysisConfig(process.env);
  let ghosted: Array<Record<string, any>> = [];
  if (ghosting) {
    const { data, error } = await supabaseAdmin.rpc("apply_lead_ghosting_rule", { p_days: 3 });
    if (error) return { configured: Boolean(config), error: ANALYSIS_MIGRATION_MESSAGE, ghosted: [], items: [], more: false };
    ghosted = (data || []) as Array<Record<string, any>>;
  }
  if (!config) return { configured: false, setup_error: setupError, error: null, ghosted, items: [], more: false };

  const skip = new Set(exclude);
  const pick = async (count: number) => {
    const { data, error } = await supabaseAdmin.rpc("lead_analysis_candidates", { p_limit: Math.min(100, count + skip.size) });
    if (error) return null;
    return ((data || []) as Array<{ lead_id: string }>).filter((row) => !skip.has(row.lead_id)).slice(0, count);
  };
  const candidates = await pick(limit);
  if (!candidates) return { configured: true, error: ANALYSIS_MIGRATION_MESSAGE, ghosted, items: [], more: false };

  const catalog = await loadCatalog();
  const queue = [...candidates];
  const items: AnalysisResult[] = [];
  let fatalError: string | null = null;
  const worker = async () => {
    while (queue.length && !fatalError) {
      const next = queue.shift()!;
      const outcome = await analyzeLead(next.lead_id, { catalog });
      items.push(outcome);
      if (outcome.result === "error") skip.add(next.lead_id);
      if (outcome.result === "error" && outcome.fatal) fatalError = outcome.error;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));

  // Failed leads stay candidates in the database, but not for this run.
  const rest = fatalError ? [] : await pick(1);
  return { configured: true, error: fatalError, ghosted, items, more: Boolean(rest && rest.length) };
}
