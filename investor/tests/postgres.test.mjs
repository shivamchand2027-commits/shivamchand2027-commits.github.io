import test from "node:test";
import assert from "node:assert/strict";
import { newDb } from "pg-mem";
import { PostgresStore } from "../server/postgres.mjs";
test("transactional store persists records, replaces by ID and rejects table injection", async () => {
  const db = newDb();
  db.public.registerFunction({
    name: "pg_advisory_xact_lock",
    args: ["integer"],
    returns: "integer",
    implementation: () => 1,
  });
  const adapter = db.adapters.createPg(),
    s = Object.create(PostgresStore.prototype);
  s.pool = new adapter.Pool();
  const query = s.pool.query.bind(s.pool);
  s.pool.query = (sql, ...args) =>
    sql.startsWith("REVOKE ")
      ? Promise.resolve({ rows: [] })
      : query(sql, ...args);
  s.ctx = new (await import("node:async_hooks")).AsyncLocalStorage();
  s.ready = s.init();
  await s.ready;
  await s.transaction(async () => {
    await s.put("Access", {
      id: "a",
      paymentId: "pay_a",
      userId: "u",
      status: "active",
    });
    await s.put("Access", {
      id: "a",
      paymentId: "pay_a",
      userId: "u",
      status: "revoked",
    });
  });
  assert.equal((await s.all("Access")).length, 1);
  assert.equal((await s.all("Access"))[0].status, "revoked");
  await assert.rejects(() =>
    s.put("Access", { id: "b", paymentId: "pay_a", userId: "u" }),
  );
  await assert.rejects(() => s.all("evil"));
  await s.close();
});
