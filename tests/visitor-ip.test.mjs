import assert from "node:assert/strict";
import { test } from "node:test";
import {
  publicIp,
  visitorRequestIp,
  visitorHostname,
  visitorDevice,
  visitorAutomation,
  VISITOR_BOT_PATTERN,
  parseIpQuery,
  edgeVisitorGeo,
  shouldLogVisitor,
  safeVisitorPath,
  safeVisitorReferer,
  visitorMapUrl,
} from "../lib/visitor-ip-core.ts";

test("Meta preview crawlers are classified as automation without labeling Facebook app browsers as bots", () => {
  const ua =
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
  const result = visitorDevice(new Headers({ "user-agent": ua }));
  assert.equal(result.metadata.is_bot, true);
  assert.equal(result.metadata.device_type, "Bot / automation");
  assert.equal(result.metadata.browser, "Meta link preview");
  for (const name of [
    "meta-externalagent",
    "meta-externalfetcher",
    "meta-webindexer",
    "meta-externalads",
    "Facebot",
  ])
    assert.equal(visitorAutomation(`${name}/1.1`), "Meta crawler");
  assert.equal(
    visitorAutomation("Mozilla/5.0 Chrome/130.0 [FBAN/FB4A;FBAV/490.0]"),
    null,
  );
});

test("known automation is excluded while ordinary and social-app browsers remain eligible", () => {
  const pattern = new RegExp(VISITOR_BOT_PATTERN, "i");
  for (const ua of [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "meta-externalagent/1.1",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "MetaPeptides-Deployment-Monitor/1.0",
    "http://meta-peptides.com/wp-admin/install.php?step=1",
    "curl/8.7.1",
    "python-requests/2.32.0",
    "Go-http-client/1.1",
    "Mozilla/5.0 HeadlessChrome/130.0.0.0",
  ]) {
    assert.equal(pattern.test(ua), true, ua);
    assert.equal(visitorDevice(new Headers({ "user-agent": ua })).metadata.is_bot, true, ua);
    assert.equal(shouldLogVisitor(new Request("https://metawellness.id/shop", {
      headers: { "user-agent": ua },
    })), false, ua);
  }
  for (const ua of [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 Chrome/130.0 [FBAN/FB4A;FBAV/490.0]",
    "Mozilla/5.0 Chrome/130.0 Instagram 350.0.0.0",
  ]) {
    assert.equal(pattern.test(ua), false, ua);
    assert.equal(shouldLogVisitor(new Request("https://metawellness.id/shop", {
      headers: { "user-agent": ua },
    })), true, ua);
  }
});

test("public IPv4/IPv6 normalization rejects private, reserved, spoofed and malformed values", () => {
  assert.equal(publicIp("8.8.8.8"), "8.8.8.8");
  assert.equal(publicIp("2001:4860:4860:0:0:0:0:8888"), "2001:4860:4860::8888");
  assert.equal(publicIp("::ffff:8.8.8.8"), "8.8.8.8");
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "169.254.169.254",
    "192.0.2.1",
    "203.0.113.1",
    "255.255.255.255",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "8.8.8.8,1.1.1.1",
    "8.8.8.8/24",
    "https://localhost/",
    null,
  ])
    assert.equal(publicIp(ip), null, String(ip));
});
test("capture uses trusted Vercel IP first and fails closed on other production hosts", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "8.8.8.8",
    "x-forwarded-for": "1.1.1.1",
    "x-real-ip": "9.9.9.9",
  });
  assert.equal(visitorRequestIp(headers, true), "8.8.8.8");
  assert.equal(visitorRequestIp(headers, false), null);
  assert.equal(
    visitorRequestIp(new Headers({ "x-forwarded-for": "1.1.1.1" }), true),
    "1.1.1.1",
  );
  assert.equal(
    visitorRequestIp(
      new Headers({ "x-forwarded-for": "1.1.1.1, 8.8.8.8" }),
      true,
    ),
    null,
  );
  assert.equal(
    visitorHostname("https://www.metawellness.id/shop"),
    "metawellness.id",
  );
  assert.equal(
    visitorHostname("https://meta-peptides.com/"),
    "meta-peptides.com",
  );
  assert.equal(visitorHostname("https://evil.example/"), null);
  assert.equal(visitorHostname("http://localhost:3101/", true), "localhost");
});
test("browser/device deduplication does not change with language, URL or domain", () => {
  const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
  const a = visitorDevice(
    new Headers({ "user-agent": ua, "accept-language": "id-ID" }),
  );
  const b = visitorDevice(
    new Headers({
      "user-agent": ua,
      "accept-language": "en-US",
      host: "metawellness.id",
    }),
  );
  assert.equal(a.key, b.key);
  assert.equal(a.metadata.device_type, "Mobile");
  assert.equal(a.metadata.browser, "Safari");
  assert.equal(a.metadata.os, "iOS / iPadOS");
  assert.notEqual(
    a.key,
    visitorDevice(new Headers({ "user-agent": "Mozilla/5.0 Chrome/130.0.0.0" }))
      .key,
  );
  assert.equal(
    visitorDevice(new Headers({ "user-agent": "Googlebot/2.1" })).metadata
      .is_bot,
    true,
  );
});
test("geolocation ignores missing/invalid coordinates and only keeps documented technical fields", () => {
  const geo = parseIpQuery(
    {
      ip: "8.8.8.8",
      isp: { isp: "Example ISP", org: "Network company", asn: "AS123" },
      location: {
        city: "Jakarta",
        country_code: "ID",
        latitude: -6.2,
        longitude: 106.8,
        timezone: "Asia/Jakarta",
      },
      risk: { is_vpn: false, is_mobile: true },
      name: "Fake IP owner",
      phone: "sensitive",
    },
    "8.8.8.8",
  );
  assert.equal(geo.isp, "Example ISP");
  assert.equal(geo.city, "Jakarta");
  assert.equal(geo.latitude, -6.2);
  assert.equal("name" in geo, false);
  assert.equal("phone" in geo, false);
  assert.equal(geo.is_vpn, false);
  assert.equal(parseIpQuery({ ip: "1.1.1.1" }, "8.8.8.8"), null);
  assert.equal(
    parseIpQuery(
      {
        ip: "8.8.8.8",
        location: { latitude: 999, longitude: 106, country_code: "ID" },
      },
      "8.8.8.8",
    ).latitude,
    undefined,
  );
  assert.equal(
    visitorMapUrl({ latitude: 0, longitude: 0 }),
    "https://www.openstreetmap.org/?mlat=0&mlon=0#map=10/0/0",
  );
  assert.equal(visitorMapUrl({ city: "Unknown" }), null);
  assert.equal(
    edgeVisitorGeo(
      new Headers({
        "x-vercel-ip-city": "Jakarta%20Pusat",
        "x-vercel-ip-country": "ID",
      }),
    ).city,
    "Jakarta Pusat",
  );
  assert.deepEqual(edgeVisitorGeo(new Headers()), {});
});
test("page capture excludes prefetches, APIs, admin pages and assets; URLs omit secrets", () => {
  const request = (path, headers = {}) =>
    new Request(`https://meta-peptides.com${path}`, { headers });
  assert.equal(shouldLogVisitor(request("/shop")), true);
  assert.equal(shouldLogVisitor(request("/nonexistent.php")), true);
  for (const path of [
    "/api/user",
    "/panel-xyz123",
    "/login-panel",
    "/_next/static/a.js",
    "/logo.webp",
    "/robots.txt",
  ])
    assert.equal(shouldLogVisitor(request(path)), false, path);
  assert.equal(
    shouldLogVisitor(request("/shop", { "next-router-prefetch": "1" })),
    false,
  );
  assert.equal(shouldLogVisitor(request("/shop", { rsc: "1" })), false);
  assert.equal(
    safeVisitorPath("https://meta-peptides.com/auth?token=secret#private"),
    "/auth",
  );
  assert.equal(
    safeVisitorReferer("https://source.example/page?email=private#token"),
    "https://source.example/page",
  );
  assert.equal(safeVisitorReferer("javascript:alert(1)"), null);
});
