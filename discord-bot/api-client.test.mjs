import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { BotApiError, requestJson } from "./api-client.mjs";

const message = { guildId: "1", channelId: "2", id: "3", author: { id: "4", username: "tester" } };

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.METAWELLNESS_API_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.DISCORD_BOT_API_SECRET = "test-secret";
  try {
    await run();
  } finally {
    server.close();
  }
}

const sendJson = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

test("explains a 404 page from a website without the bot API", async () => {
  await withServer(
    (req, res) => {
      res.writeHead(404, { "content-type": "text/html" });
      res.end("<!DOCTYPE html><html><body>Not found</body></html>");
    },
    async () => {
      await assert.rejects(
        requestJson("/api/bot/aftersales", {
          message,
          command: "aftersales",
          query: { date_from: "2026-10-31", date_to: "2026-10-31" },
        }),
        (error) =>
          error instanceof BotApiError &&
          error.status === 404 &&
          /API bot tidak ditemukan di http:\/\/127\.0\.0\.1:\d+ \(HTTP 404\)/.test(error.message) &&
          /belum ter-deploy/.test(error.message),
      );
    },
  );
});

test("signs requests and passes API data and errors through", async () => {
  await withServer(
    (req, res) => {
      assert.match(req.headers["x-meta-bot-signature"], /^[0-9a-f]{64}$/);
      assert.equal(req.headers["x-discord-channel-id"], "2");
      if (req.url.startsWith("/api/bot/ok")) return sendJson(res, 200, { success: true, data: { total: 1 } });
      return sendJson(res, 400, { success: false, message: "status wajib", error: { candidates: ["x"] } });
    },
    async () => {
      assert.deepEqual(await requestJson("/api/bot/ok", { message, command: "dailyreport" }), { total: 1 });
      await assert.rejects(
        requestJson("/api/bot/bad", { message, command: "newleads", method: "POST", json: {} }),
        (error) => error.status === 400 && error.message === "status wajib" && error.details.candidates[0] === "x",
      );
    },
  );
});
