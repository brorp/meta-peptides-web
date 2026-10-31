// Parses Discord command messages:
//
//   !command <argument text>
//   field: value
//   field: value
//   continuation line (appended to the previous field)

export class CommandInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "CommandInputError";
  }
}

export function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const FIELD_LINE = /^([A-Za-z][A-Za-z0-9 _-]{0,30}):\s*(.*)$/;

// getSpec(command) may return { fields, freeText, positional }:
// - fields: allowed field names for the command
// - freeText: fields whose text may contain "x: y" (e.g. "Jam: 10 pagi" in
//   notes), so an unknown key there is treated as a continuation line
// - positional: false when the command takes no argument after its name, so
//   "!newleads wa: 0812" on one line still works
export function parseCommandMessage(content, getSpec = () => null) {
  const lines = String(content || "").replace(/\r/g, "").split("\n");
  const firstLine = String(lines.shift() || "").trim();
  const firstSpace = firstLine.search(/\s/);
  const command = (firstSpace === -1 ? firstLine : firstLine.slice(0, firstSpace)).toLowerCase();
  let argumentText = firstSpace === -1 ? "" : firstLine.slice(firstSpace + 1).trim();
  const spec = getSpec(command) || null;
  const knownFields = spec?.fields ? new Set(spec.fields) : null;
  const freeTextFields = new Set(spec?.freeText || []);

  if (spec?.positional === false && FIELD_LINE.test(argumentText)) {
    lines.unshift(argumentText);
    argumentText = "";
  }

  const fields = new Map();
  const order = [];
  let activeKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(FIELD_LINE);
    if (match) {
      const key = normalizeKey(match[1]);
      const isKnown = !knownFields || knownFields.has(key);
      if (isKnown || !activeKey || !freeTextFields.has(activeKey)) {
        const values = fields.get(key) || [];
        values.push(match[2].trim());
        fields.set(key, values);
        order.push(key);
        activeKey = key;
        continue;
      }
    }

    if (activeKey) {
      const values = fields.get(activeKey);
      values[values.length - 1] = `${values[values.length - 1]}\n${line}`.trim();
    } else {
      throw new CommandInputError(
        `Baris "${line}" tidak dikenali. Tulis setiap data sebagai "field: isi" di baris baru.`,
      );
    }
  }

  return {
    command,
    argumentText,
    args: argumentText.split(/\s+/).filter(Boolean),
    keys: [...new Set(order)],
    get(key) {
      return fields.get(normalizeKey(key))?.at(-1);
    },
    getAll(key) {
      return fields.get(normalizeKey(key)) || [];
    },
    has(key) {
      return fields.has(normalizeKey(key));
    },
  };
}

// Rejects typos such as "stat: hot" instead of silently ignoring them.
export function assertKnownFields(parsed, allowed, commandName) {
  const unknown = parsed.keys.filter((key) => !allowed.includes(key));
  if (!unknown.length) return;
  if (!allowed.length) {
    throw new CommandInputError(`${commandName} tidak memakai field tambahan. Hapus baris: ${unknown.join(", ")}.`);
  }
  throw new CommandInputError(
    `Field tidak dikenal: ${unknown.join(", ")}. Field untuk ${commandName}: ${allowed.join(", ")}.`,
  );
}

export function parseBoolean(value, fieldName = "nilai") {
  if (value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "yes", "ya", "y", "1"].includes(normalized)) return true;
  if (["false", "no", "tidak", "n", "0"].includes(normalized)) return false;
  throw new CommandInputError(`${fieldName} harus true atau false, bukan "${value}".`);
}

// Accepts 1750000, 1.750.000, 1,750,000, Rp 1.750.000, 1.75jt, 350rb, 25k.
export function parseMoney(value, fieldName = "nominal") {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;

  let text = raw.toLowerCase().replace(/^rp\.?/, "").replace(/\s+/g, "");
  let multiplier = 1;
  const suffix = text.match(/(jt|juta|rb|ribu|k)$/);
  if (suffix) {
    multiplier = ["jt", "juta"].includes(suffix[1]) ? 1_000_000 : 1_000;
    text = text.slice(0, -suffix[1].length).replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(text)) {
      throw new CommandInputError(`${fieldName} "${raw}" tidak valid.`);
    }
    return Math.round(Number(text) * multiplier);
  }

  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ""));
  if (/^\d+$/.test(text)) return Number(text);
  if (/^\d+[.,]\d{1,2}$/.test(text)) return Number(text.replace(",", "."));
  throw new CommandInputError(`${fieldName} "${raw}" tidak valid. Contoh: 1750000 atau 1.750.000`);
}

// item: <qty> | <produk> [| <harga custom>]   or   item: <qty> x <produk>
export function parseInvoiceItems(values) {
  if (!values.length) {
    throw new CommandInputError("Minimal 1 baris item. Contoh: item: 2 | reta 10 mg");
  }

  return values.map((value, index) => {
    const text = String(value).trim();
    const parts = text.split("|").map((part) => part.trim());
    let quantityText;
    let query;
    let priceText;

    if (parts.length >= 2) {
      [quantityText, query, priceText] = parts;
      if (parts.length > 3) {
        throw new CommandInputError(`Item ${index + 1} "${text}" terlalu banyak tanda |.`);
      }
    } else {
      const match = text.match(/^(\d+)\s*[xX]\s+(.+)$/);
      if (match) [, quantityText, query] = match;
    }

    if (!quantityText || !/^\d+$/.test(quantityText) || !query) {
      throw new CommandInputError(
        `Format item ${index + 1} salah: "${text}". Gunakan "item: 2 | reta 10 mg" atau "item: 2 | reta 10 mg | 1500000".`,
      );
    }

    const quantity = Number(quantityText);
    if (quantity < 1 || quantity > 100) {
      throw new CommandInputError(`Qty item ${index + 1} harus 1-100.`);
    }

    return {
      quantity,
      query,
      price: priceText ? parseMoney(priceText, `Harga item ${index + 1}`) : null,
    };
  });
}

export function isValidDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text || ""))) return false;
  const date = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

export function jakartaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const RANGE_SEPARATORS = new Set(["-", "–", "—", "~", "s/d", "sd", "s.d", "s.d.", "sampai", "hingga", "to"]);
const JOINED_RANGE = /^(\d{4}-\d{2}-\d{2})\s*[-–—~]\s*(\d{4}-\d{2}-\d{2})$/;

// No date = today (WIB), one date = that day only, two dates = range.
// Accepts "2026-10-01 2026-10-31", "2026-10-01 - 2026-10-31",
// "2026-10-01-2026-10-31", and "2026-10-01 sampai 2026-10-31".
export function parseDateArgs(args, now = new Date()) {
  const joined = args.join(" ").trim().match(JOINED_RANGE);
  const dates = joined
    ? [joined[1], joined[2]]
    : args.filter((arg) => !RANGE_SEPARATORS.has(String(arg).toLowerCase()));

  if (dates.length > 2) {
    throw new CommandInputError("Maksimal 2 tanggal: <dari YYYY-MM-DD> <sampai YYYY-MM-DD>.");
  }
  const [first, second] = dates;
  const dateFrom = first || jakartaToday(now);
  const dateTo = second || dateFrom;

  for (const date of [dateFrom, dateTo]) {
    if (!isValidDate(date)) {
      throw new CommandInputError(`Tanggal "${date}" salah. Format wajib YYYY-MM-DD, contoh 2026-10-31.`);
    }
  }
  if (dateFrom > dateTo) {
    throw new CommandInputError("Tanggal awal tidak boleh setelah tanggal akhir.");
  }
  return { dateFrom, dateTo };
}
