import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSIS_NOT_CONFIGURED,
  ANALYSIS_SYSTEM_PROMPT,
  DEFAULT_FREELLMAPI_MODEL,
  freellmapiSystemPrompt,
  parseAnalysisText,
  readAnalysisConfig,
} from "../lib/lead-chat-analysis-core.ts";

const ROUTER = { FREELLMAPI_BASE_URL: "https://llm.example.com/v1/", FREELLMAPI_API_KEY: "freellmapi-unified" };
const answer = (overrides = {}) => ({
  enough_info: true,
  status: "hot",
  rejection: null,
  interest_products: ["Retatrutide 10mg"],
  interest_text: null,
  goal: "turun BB 10 kg",
  domicile: "Surabaya",
  summary: "Minta nomor rekening.",
  evidence: "rekeningnya apa kak?",
  confidence: "high",
  ...overrides,
});

test("FREELLMAPI_BASE_URL forces the router, even with ANTHROPIC_API_KEY set", () => {
  const { config, error } = readAnalysisConfig({ ...ROUTER, ANTHROPIC_API_KEY: "sk-ant-real", LEAD_ANALYSIS_MODEL: "claude-haiku-5-5" });
  assert.equal(error, null);
  assert.deepEqual(config, {
    provider: "freellmapi",
    model: DEFAULT_FREELLMAPI_MODEL,
    baseURL: "https://llm.example.com",
    apiKey: "freellmapi-unified",
    autoApplyStatus: false,
  });
  assert.equal(readAnalysisConfig({ ...ROUTER, FREELLMAPI_MODEL: "auto:fast" }).config.model, "auto:fast");
  assert.equal(readAnalysisConfig({ ...ROUTER, FREELLMAPI_MODEL: "groq/llama-3.3-70b-versatile" }).config.model, "groq/llama-3.3-70b-versatile");
  assert.equal(readAnalysisConfig({ ...ROUTER, FREELLMAPI_MODEL: "auto; rm -rf" }).config.model, DEFAULT_FREELLMAPI_MODEL);
  assert.equal(readAnalysisConfig({ ...ROUTER, LEAD_ANALYSIS_AUTO_APPLY: "status" }).config.autoApplyStatus, true);
  assert.equal(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "https://vps.example.com/llm/v1" }).config.baseURL, "https://vps.example.com/llm");
});

test("the router URL must be https unless it runs on the same machine", () => {
  assert.match(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "http://203.0.113.5:3001" }).error, /harus https/);
  assert.equal(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "http://127.0.0.1:3001/v1" }).config.baseURL, "http://127.0.0.1:3001");
  assert.equal(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "http://localhost:3001" }).config.baseURL, "http://localhost:3001");
  assert.match(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "llm.example.com" }).error, /bukan URL/);
  assert.match(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "https://a:b@llm.example.com" }).error, /tanpa user/);
  assert.match(readAnalysisConfig({ ...ROUTER, FREELLMAPI_BASE_URL: "https://llm.example.com?key=x" }).error, /tanpa user/);
  const missingKey = readAnalysisConfig({ FREELLMAPI_BASE_URL: ROUTER.FREELLMAPI_BASE_URL, ANTHROPIC_API_KEY: "sk-ant-real" });
  assert.equal(missingKey.config, null, "a broken router setup never falls back to Claude");
  assert.match(missingKey.error, /FREELLMAPI_API_KEY/);
});

test("without the router: Claude with ANTHROPIC_API_KEY, or off", () => {
  assert.deepEqual(readAnalysisConfig({ ANTHROPIC_API_KEY: "sk-ant", LEAD_ANALYSIS_MODEL: "claude-haiku-5-5", LEAD_ANALYSIS_EFFORT: "medium" }), {
    config: { provider: "anthropic", model: "claude-haiku-5-5", effort: "medium", autoApplyStatus: false },
    error: null,
  });
  assert.deepEqual(readAnalysisConfig({ FREELLMAPI_BASE_URL: "  " }), { config: null, error: ANALYSIS_NOT_CONFIGURED });
  assert.match(ANALYSIS_NOT_CONFIGURED, /FREELLMAPI_BASE_URL/);
});

test("router prompt: the approved definitions, the catalog, and the JSON format", () => {
  const prompt = freellmapiSystemPrompt(["NAD+ 1000mg", "Retatrutide 10mg"]);
  assert.ok(prompt.startsWith(ANALYSIS_SYSTEM_PROMPT));
  assert.match(prompt, /- Retatrutide 10mg/);
  assert.match(prompt, /one JSON object and nothing else/);
  assert.match(prompt, /"required":\["enough_info","status"/);
});

test("lenient parsing reads the JSON inside a looser answer", () => {
  const json = JSON.stringify(answer());
  for (const text of [
    json,
    `Berikut hasilnya:\n\`\`\`json\n${json}\n\`\`\``,
    `<think>customer minta rekening, jadi hot</think>\n${json}`,
    `Hasil analisa: ${json} Semoga membantu.`,
  ]) {
    const parsed = parseAnalysisText(text, { lenient: true });
    assert.equal(parsed.error, undefined, text.slice(0, 40));
    assert.equal(parsed.output.status, "hot");
    assert.deepEqual(parsed.output.interest_products, ["Retatrutide 10mg"]);
  }
  assert.equal(parseAnalysisText(`\`\`\`json\n${json}\n\`\`\``).error, "Jawaban AI bukan JSON", "Claude mode stays strict");
});

test("lenient parsing fixes small slips but not wrong values", () => {
  const slips = parseAnalysisText(
    JSON.stringify({
      ...answer({ status: "Hot", rejection: "null", interest_products: "NAD+ 1000mg", goal: "", confidence: "Tinggi", reason: "extra key" }),
      evidence: undefined,
    }),
    { lenient: true },
  );
  assert.equal(slips.error, undefined);
  assert.deepEqual(
    [slips.output.status, slips.output.rejection, slips.output.interest_products, slips.output.goal, slips.output.evidence, slips.output.confidence],
    ["hot", null, ["NAD+ 1000mg"], null, null, "high"],
  );
  assert.equal(parseAnalysisText(JSON.stringify(answer({ rejection: "ghosting", status: "cold" })), { lenient: true }).output.rejection, null, "ghosting is the rule's job");
  assert.equal(parseAnalysisText(JSON.stringify(answer({ confidence: undefined })), { lenient: true }).output.confidence, "low");
  const thin = parseAnalysisText(JSON.stringify({ enough_info: "false", status: "warm", summary: "Baru salam." }), { lenient: true });
  assert.equal(thin.output.enough_info, false);
  assert.equal(thin.output.status, null);

  assert.equal(parseAnalysisText(JSON.stringify(answer({ status: "interested" })), { lenient: true }).error, "Jawaban AI tidak sesuai format");
  assert.equal(parseAnalysisText(JSON.stringify(answer({ rejection: "mahal" })), { lenient: true }).error, "Jawaban AI tidak sesuai format");
  assert.equal(parseAnalysisText("Statusnya hot ya kak", { lenient: true }).error, "Jawaban AI bukan JSON");
  assert.equal(parseAnalysisText("  ", { lenient: true }).error, "Jawaban AI kosong");
  assert.equal(parseAnalysisText("[1,2]", { lenient: true }).error, "Jawaban AI tidak sesuai format");
});
