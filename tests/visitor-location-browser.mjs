// Run against a local production build only. All API traffic is mocked; no test
// positions/accounts are written to Supabase. Provide PLAYWRIGHT_MODULE_PATH if
// Playwright is supplied by the workspace runtime rather than node_modules.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const base = process.env.VISITOR_TEST_URL || "http://localhost:3102";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Browser tests must stay local");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const calls = [];
const id = "00000000-0000-4000-8000-000000000001";
const now = () => new Date().toISOString();
const location = () => ({ session_id: id, ip_id: id, device_key: "a".repeat(64), hostname: "metawellness.id", latitude: -6.2, longitude: 106.8, accuracy_m: 7, observed_at: now(), received_at: now(), consented_at: now(), sharing: true, ended_at: null, device: { metadata: { browser: "Chrome", os: "Android", device_type: "Mobile" } } });
const ip = () => ({ id, ip_address: "8.8.8.8", first_seen_at: now(), hostnames: ["metawellness.id"], entry_path: "/shipping", geo: { city: "Jakarta", country_code: "ID", isp: "Example ISP", latitude: -6.1, longitude: 106.7 }, geo_status: "ready", geo_source: "ipquery", geo_checked_at: now(), visitor_ip_devices: [{ count: 1 }], visitor_ip_identities: [{ count: 0 }], locations: [location()] });
async function configure(context) {
  await context.addInitScript(() => {
    localStorage.setItem("metapeptides_age_verified", "true");
    localStorage.setItem("metapeptides_promo_first_visit", "true");
    window.__watchOptions = [];
    window.__clearWatch = 0;
    const watch = navigator.geolocation.watchPosition.bind(navigator.geolocation);
    const clear = navigator.geolocation.clearWatch.bind(navigator.geolocation);
    navigator.geolocation.watchPosition = (success, error, options) => { window.__watchOptions.push(options); return watch(success, error, options); };
    navigator.geolocation.clearWatch = (id) => { window.__clearWatch++; return clear(id); };
  });
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== base) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    let data = [], status = 200;
    if (url.pathname === "/api/visitor-location") {
      const body = request.postDataJSON(); calls.push(body);
      data = body.mode === "start" ? { session_id: randomUUID() } : { status: "saved" };
    } else if (url.pathname === "/api/admin/auth/me") data = { role: "root" };
    else if (url.pathname === "/api/admin/visitor-logs") data = { items: [ip()], pagination: { total: 1, page: 1, total_pages: 1 } };
    else if (url.pathname === `/api/admin/visitor-logs/${id}`) data = { ip: ip(), devices: [], identities: [], device_count: 0, identity_count: 0, locations_available: true, device_locations: [location(), { ...location(), session_id: "00000000-0000-4000-8000-000000000002", sharing: false, ended_at: now(), observed_at: new Date(Date.now()-60_000).toISOString() }] };
    else if (["/api/user", "/api/auth/guest"].includes(url.pathname)) status = 401;
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ success: status === 200, data }) });
  });
}
try {
  const context = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: -6.2, longitude: 106.8, accuracy: 7 }, viewport: { width: 1280, height: 900 } });
  await configure(context);
  const page = await context.newPage();
  const response = await page.goto(`${base}/shipping`);
  assert.ok(response.headers()["permissions-policy"].includes("geolocation=(self)"));
  await page.getByRole("button", { name: "Izinkan berbagi lokasi" }).waitFor();
  assert.equal(calls.length, 0, "No collection before an explicit opt-in");
  assert.equal((await page.evaluate(() => window.__watchOptions)).length, 0);
  await page.getByRole("button", { name: "Izinkan berbagi lokasi" }).click();
  await page.getByRole("status").filter({ hasText: "Berbagi lokasi aktif" }).waitFor();
  assert.ok(calls.some(c => c.mode === "update" && c.latitude === -6.2 && c.accuracy_m === 7));
  assert.equal(await page.evaluate(() => window.__watchOptions[0].enableHighAccuracy), true);
  assert.equal(await page.evaluate(() => window.__watchOptions[0].maximumAge), 0);
  await context.setGeolocation({ latitude: -6.3, longitude: 106.9, accuracy: 4 });
  await page.waitForResponse(r => r.url().endsWith("/api/visitor-location") && r.request().postDataJSON()?.latitude === -6.3);
  await page.evaluate(() => {
    window.__hidden = true;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => window.__hidden });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByRole("status").filter({ hasText: "dijeda" }).waitFor();
  assert.ok(calls.some(c => c.mode === "pause"));
  await page.evaluate(() => { window.__hidden = false; document.dispatchEvent(new Event("visibilitychange")); });
  await page.getByRole("status").filter({ hasText: "Berbagi lokasi aktif" }).waitFor();
  await page.getByRole("button", { name: "Berhenti berbagi lokasi" }).click();
  await page.getByRole("status").filter({ hasText: "dihentikan" }).waitFor();
  const before = calls.filter(c => c.mode === "update").length;
  await context.setGeolocation({ latitude: -7, longitude: 110, accuracy: 3 });
  await page.waitForTimeout(11_000);
  assert.equal(calls.filter(c => c.mode === "update").length, before, "Stop clears both watch and periodic reads");
  assert.ok(calls.some(c => c.mode === "stop"));
  assert.ok(await page.evaluate(() => window.__clearWatch >= 2));
  await page.getByRole("region", { name: "Berbagi lokasi opsional" }).screenshot({ path: ".next/visitor-location-sharing.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("region", { name: "Berbagi lokasi opsional" }).screenshot({ path: ".next/visitor-location-sharing-mobile.png" });
  const button = await page.getByRole("button", { name: "Izinkan berbagi lokasi" }).boundingBox();
  assert.ok(button.x >= 0 && button.x + button.width <= 390, "Consent button fits the mobile viewport");
  await page.setViewportSize({ width: 1280, height: 900 });
  const adminToken = await new SignJWT({ role: "root" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.ADMIN_JWT_SECRET));
  await context.addCookies([{ name: "admin-session", value: adminToken, url: base }]);
  await page.goto(`${base}/panel-xyz123/visitor-logs`);
  await page.getByRole("button", { name: "8.8.8.8", exact: true }).click();
  await page.getByText("Lokasi perangkat · pembaruan otomatis", { exact: true }).waitFor();
  assert.equal(await page.getByText("Aktif · lokasi terbaru", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Berbagi dihentikan · lokasi terakhir", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Sumber: lokasi perangkat via browser · Akurasi ±7 m", { exact: true }).count(), 2);
  assert.equal(await page.locator('iframe[title^="Peta lokasi perangkat"]').count(), 2);
  await page.getByRole("dialog").screenshot({ path: ".next/visitor-location-panel.png" });
  const denied = await browser.newContext();
  await configure(denied);
  await denied.addInitScript(() => {
    navigator.geolocation.watchPosition = (_success, failure) => { queueMicrotask(() => failure({ code: 1 })); return 1; };
  });
  const deniedPage = await denied.newPage();
  await deniedPage.goto(`${base}/shipping`);
  await deniedPage.getByRole("button", { name: "Izinkan berbagi lokasi" }).click();
  await deniedPage.getByRole("status").filter({ hasText: "Izin lokasi tidak diberikan" }).waitFor();
  await denied.close(); await context.close();
  console.log(JSON.stringify({ optInBeforeCollection: "pass", highAccuracyBrowserReadings: "pass", coordinateUpdates: "pass", pauseResumeStop: "pass", deniedPermission: "pass", distinctSessionMapsAndStaleLabels: "pass" }));
} finally { await browser.close(); }
