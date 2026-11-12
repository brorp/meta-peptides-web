import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

// The listener must never send anything to WhatsApp: no messages, read
// receipts, typing/online presence, or chat/profile changes. The one write is
// saving leads as contacts, only in contacts.mjs.
const FORBIDDEN = [
  "sendMessage",
  "relayMessage",
  "readMessages",
  "sendReceipt",
  "sendReceipts",
  "sendPresenceUpdate",
  "presenceSubscribe",
  "chatModify",
  "updateProfile",
  "updateBlockStatus",
  "groupCreate",
  "rejectCall",
  "sendPeerDataOperationMessage",
];

test("no code path sends to WhatsApp", () => {
  const files = readdirSync(new URL(".", import.meta.url)).filter((file) => file.endsWith(".mjs") && !file.endsWith(".test.mjs"));
  assert.ok(files.includes("index.mjs"));
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const name of FORBIDDEN) assert.ok(!source.includes(name), `${file} uses ${name}`);
  }
});

test("the socket is created offline and without history", () => {
  const source = readFileSync(new URL("index.mjs", import.meta.url), "utf8");
  assert.match(source, /markOnlineOnConnect: false/);
  assert.match(source, /syncFullHistory: false/);
  assert.match(source, /shouldSyncHistoryMessage: \(\) => false/);
});

test("the only WhatsApp writes are contacts, only in contacts.mjs", () => {
  const files = readdirSync(new URL(".", import.meta.url)).filter((file) => file.endsWith(".mjs") && !file.endsWith(".test.mjs"));
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const writes = [...source.matchAll(/sock(?:et)?\??\.(\w+)\(/g)].map((match) => match[1]);
    const allowed = file === "contacts.mjs" ? ["addOrEditContact", "removeContact"] : ["logout", "end", "requestPairingCode", "ev"];
    for (const name of writes) assert.ok(allowed.includes(name), `${file} calls sock.${name}()`);
  }
  const contacts = readFileSync(new URL("contacts.mjs", import.meta.url), "utf8");
  assert.match(contacts, /saveOnPrimaryAddressbook: false/, "never into the phone address book");
});
