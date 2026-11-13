import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

// No production URL or credentials are read. Disposable PostgreSQL has no
// network access or published ports; its data lives only in container tmpfs.
test("KPI migrations enforce audit integrity, timestamps, deduplication, review concurrency and RLS", async () => {
  const name = `meta-cs-kpi-test-${randomUUID()}`;
  const run = (args, input) => {
    const result = spawnSync("docker", args, {
      input,
      encoding: "utf8",
      timeout: 60000,
    });
    assert.equal(
      result.status,
      0,
      `docker ${args[0]} failed: ${result.stderr}\n${result.stdout}`,
    );
    return result.stdout;
  };
  const psql = [
    "exec",
    "-i",
    name,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
  ];
  try {
    run([
      "run",
      "--rm",
      "--detach",
      "--name",
      name,
      "--network",
      "none",
      "--tmpfs",
      "/var/lib/postgresql/data",
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      process.env.CS_KPI_TEST_PG_IMAGE || "postgres:16-alpine",
    ]);
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const probe = spawnSync(
        "docker",
        ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"],
        { encoding: "utf8" },
      );
      if (probe.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, "Disposable PostgreSQL did not start");
    run(
      psql,
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role; CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),status text,tracking_number text); CREATE TABLE leads(id uuid PRIMARY KEY DEFAULT gen_random_uuid()); INSERT INTO orders(status,tracking_number) VALUES ('pending','old-before-supervision');",
    );
    // Also exercise the strict case: both migrations run in one transaction,
    // where now() is identical. Old rows must still precede activation.
    const migrations = [
      "supabase/migrations/20261113090000_add_cs_kpi_supervision.sql",
      "supabase/migrations/20261113091000_configure_cs_kpi_schedule.sql",
    ]
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    run(psql, `BEGIN;\n${migrations}\nCOMMIT;`);
    run(psql, readFileSync("tests/cs-kpi-migration.sql", "utf8"));
  } finally {
    spawnSync("docker", ["rm", "--force", name], {
      encoding: "utf8",
      timeout: 10000,
    });
  }
});
