// Builds !help text from the command specs in commands.mjs so the help and
// the parser always agree on field names.

const GROUP_ORDER = ["Leads", "Order", "Reminder", "Report", "Bantuan"];

export function buildHelpIndex(specs) {
  const lines = [
    "**📘 Meta Wellness Bot — daftar command**",
    "Ketik `!help <command>` untuk format lengkap + contoh, misalnya `!help invoice`.",
    "Format umum: baris pertama `!command`, lalu setiap data di baris baru sebagai `field: isi`.",
    "",
  ];

  for (const group of GROUP_ORDER) {
    const entries = Object.entries(specs).filter(([, spec]) => spec.group === group);
    if (!entries.length) continue;
    lines.push(`**${group}${group === "Direksi" ? " (khusus channel direksi)" : ""}**`);
    for (const [name, spec] of entries) {
      lines.push(`\`${spec.usage}\` — ${spec.summary}`);
    }
    lines.push("");
  }

  lines.push(
    "Tanggal selalu format `YYYY-MM-DD`. Rentang: `<dari> <sampai>` (boleh pakai `-` atau `sampai`). Satu tanggal = hari itu saja, tanpa tanggal = hari ini (WIB).",
  );
  return lines.join("\n").trim();
}

export function buildTemplate(spec) {
  const lines = [spec.example?.firstLine || spec.usage];
  for (const field of spec.fields || []) {
    const examples = Array.isArray(field.example) ? field.example : [field.example];
    for (const example of examples) {
      if (example !== undefined) lines.push(`${field.name}: ${example}`);
    }
  }
  return lines.join("\n");
}

export function buildCommandHelp(name, spec) {
  const required = (spec.fields || []).filter((field) => field.required);
  const optional = (spec.fields || []).filter((field) => !field.required);
  const lines = [`**${name}** — ${spec.summary}`];

  if (spec.directorsOnly) lines.push("🔒 Hanya bisa dipakai di channel direksi.");
  if (spec.description) lines.push(spec.description);

  lines.push("", "**Format** (copy, lalu ganti isinya):", "```", buildTemplate(spec), "```");

  if (spec.argument) lines.push(`**Setelah nama command:** ${spec.argument}`);
  if (required.length) {
    lines.push(`**Wajib:** ${required.map((field) => `\`${field.name}\``).join(", ")}`);
  }
  if (optional.length) {
    lines.push(`**Opsional:** ${optional.map((field) => `\`${field.name}\``).join(", ")}`);
  }

  if (spec.fields?.length) {
    lines.push("", "**Keterangan field**");
    for (const field of spec.fields) {
      lines.push(`• \`${field.name}\`${field.required ? " (wajib)" : ""} — ${field.description}`);
    }
  }

  if (spec.notes?.length) {
    lines.push("", "**Catatan**");
    for (const note of spec.notes) lines.push(`• ${note}`);
  }

  return lines.join("\n");
}
