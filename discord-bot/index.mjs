import { Client, Events, GatewayIntentBits } from "discord.js";
import { BotApiError, requestFile, requestJson } from "./api-client.mjs";
import { COMMAND_SPECS, getCommandSpec } from "./commands.mjs";
import { splitMessage } from "./format.mjs";
import { CommandInputError, parseCommandMessage } from "./parser.mjs";

const REQUIRED_ENV = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "DISCORD_ALLOWED_CHANNEL_IDS",
  "DISCORD_DIRECTORS_CHANNEL_IDS",
  "DISCORD_BOT_API_SECRET",
  "METAWELLNESS_API_BASE_URL",
];

const missing = REQUIRED_ENV.filter((key) => !String(process.env[key] || "").trim());
if (missing.length) {
  console.error(`[bot] Env belum diisi: ${missing.join(", ")}. Lihat discord-bot/env.example.`);
  process.exit(1);
}

const parseIds = (value) =>
  new Set(String(value || "").split(",").map((item) => item.trim()).filter(Boolean));

const guildId = String(process.env.DISCORD_GUILD_ID).trim();
const directorChannels = parseIds(process.env.DISCORD_DIRECTORS_CHANNEL_IDS);
// Director channels are always allowed, even if not repeated in the list.
const allowedChannels = new Set([...parseIds(process.env.DISCORD_ALLOWED_CHANNEL_IDS), ...directorChannels]);
const config = {
  brandName: process.env.INVOICE_BRAND_NAME || "MetaPeptides",
  paymentInfo: String(process.env.INVOICE_PAYMENT_INFO || "").replace(/\\n/g, "\n").trim(),
};

function createContext(message, parsed, name, spec) {
  const command = name.slice(1);
  const request = (method, path, { json, query } = {}) =>
    requestJson(path, { method, json, query, message, command });
  const quiet = { allowedMentions: { parse: [], repliedUser: false } };

  const reply = async (content, files = []) => {
    const chunks = splitMessage(content);
    for (let index = 0; index < chunks.length; index += 1) {
      const isLast = index === chunks.length - 1;
      const payload = { content: chunks[index], ...quiet, ...(isLast && files.length ? { files } : {}) };
      if (index === 0) await message.reply(payload);
      else await message.channel.send(payload);
    }
  };

  return {
    message,
    parsed,
    name,
    spec,
    config,
    reply,
    send: reply,
    // Separate message with only the text, so "Copy Text" copies just this.
    sendPlain: async (content) => {
      for (const chunk of splitMessage(content)) {
        await message.channel.send({ content: chunk, ...quiet });
      }
    },
    api: {
      get: (path, options = {}) => request("GET", path, { query: options.query }),
      post: (path, json) => request("POST", path, { json }),
      patch: (path, json) => request("PATCH", path, { json }),
      file: (path, options = {}) =>
        requestFile(path, { method: "GET", query: options.query, message, command }),
    },
  };
}

function formatError(error, name) {
  if (error instanceof CommandInputError) {
    return `❌ ${error.message}`;
  }
  if (error instanceof BotApiError) {
    const candidates = Array.isArray(error.details?.candidates) ? error.details.candidates : [];
    const hint = error.status === 400 ? `\nKetik \`!help ${name.slice(1)}\` untuk format lengkap.` : "";
    return [
      `❌ ${error.message}`,
      candidates.length ? `Mungkin maksudnya:\n${candidates.slice(0, 8).map((item) => `• ${item}`).join("\n")}` : null,
    ].filter(Boolean).join("\n") + hint;
  }
  console.error(`[bot] ${name} gagal:`, error);
  return "❌ Terjadi error di bot. Coba lagi, kalau masih gagal hubungi admin.";
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[bot] Online sebagai ${readyClient.user.tag}. Channel aktif: ${allowedChannels.size}, channel direksi: ${directorChannels.size}.`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || message.guildId !== guildId) return;
  if (!message.content.trimStart().startsWith("!")) return;

  const firstWord = message.content.trim().split(/\s+/)[0].toLowerCase();
  const spec = COMMAND_SPECS[firstWord];
  if (!spec || !allowedChannels.has(message.channelId)) return;

  const quiet = { allowedMentions: { parse: [], repliedUser: false } };
  if (spec.directorsOnly && !directorChannels.has(message.channelId)) {
    await message.reply({ content: `🔒 ${firstWord} hanya bisa dipakai di channel direksi.`, ...quiet });
    return;
  }

  try {
    const parsed = parseCommandMessage(message.content, getCommandSpec);
    const context = createContext(message, parsed, firstWord, spec);
    await message.channel.sendTyping().catch(() => {});
    console.log(`[bot] ${message.author.username} #${message.channelId}: ${firstWord}`);
    await spec.handler(context);
  } catch (error) {
    const text = formatError(error, firstWord);
    for (const chunk of splitMessage(text)) {
      await message.reply({ content: chunk, ...quiet }).catch((replyError) => {
        console.error("[bot] Gagal membalas pesan:", replyError);
      });
    }
  }
});

client.on(Events.Error, (error) => console.error("[bot] Discord client error:", error));
process.on("unhandledRejection", (error) => console.error("[bot] Unhandled rejection:", error));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    console.log(`[bot] ${signal} diterima, bot dimatikan.`);
    await client.destroy();
    process.exit(0);
  });
}

client.login(process.env.DISCORD_BOT_TOKEN).catch((error) => {
  console.error("[bot] Login Discord gagal. Cek DISCORD_BOT_TOKEN dan Message Content Intent:", error.message);
  process.exit(1);
});
