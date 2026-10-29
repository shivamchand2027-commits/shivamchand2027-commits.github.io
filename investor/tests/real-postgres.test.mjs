// Dedicated empty LOCAL test DB only. Never point at production: this test writes rows.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { PostgresStore } from "../server/postgres.mjs";
test(
  "real Postgres rollback, multi-connection locking, uniqueness and schema protection",
  { skip: !process.env.ADYA_TEST_DATABASE_URL },
  async () => {
    const a = new PostgresStore(process.env.ADYA_TEST_DATABASE_URL),
      b = new PostgresStore(process.env.ADYA_TEST_DATABASE_URL),
      prefix = "test_" + crypto.randomUUID();
    try {
      await Promise.all([a.ready, b.ready]);
      await assert.rejects(() =>
        a.transaction(async () => {
          await a.put("Access", {
            id: prefix + "_rollback",
            paymentId: prefix + "_rollback",
          });
          throw Error("rollback");
        }),
      );
      assert(
        !(await a.all("Access")).some((r) => r.id === prefix + "_rollback"),
      );
      let release;
      const gate = new Promise((r) => (release = r));
      const seq = [];
      const first = a.transaction(async () => {
        seq.push("a1");
        release();
        await new Promise((r) => setTimeout(r, 50));
        await a.put("Access", {
          id: prefix,
          paymentId: prefix,
          status: "active",
        });
        seq.push("a2");
      });
      await gate;
      const second = b.transaction(async () => {
        seq.push("b");
        assert((await b.all("Access")).some((r) => r.id === prefix));
      });
      await Promise.all([first, second]);
      assert.deepEqual(seq, ["a1", "a2", "b"]);
      await assert.rejects(() =>
        b.put("Access", { id: prefix + "_dup", paymentId: prefix }),
      );
      await a.authPut("session", prefix, { userId: "u" }, Date.now() + 60000);
      assert.equal((await b.authGet("session", prefix)).userId, "u");
      await a.authPut("nonce", prefix, {}, Date.now() + 60000);
      const consumed = await Promise.all([
        a.authConsume("nonce", prefix),
        b.authConsume("nonce", prefix),
      ]);
      assert.equal(consumed.filter(Boolean).length, 1);
      const hits = await Promise.all(
        Array.from({ length: 50 }, () => a.rateHit(prefix)),
      );
      assert.equal(hits.filter(Boolean).length, 45);
      const r = await a.pool.query(
        "SELECT has_schema_privilege('public','adya_portal','USAGE') AS allowed",
      );
      assert.equal(r.rows[0].allowed, false);
    } finally {
      await a.pool.query("DELETE FROM adya_portal.records WHERE id LIKE $1", [
        prefix + "%",
      ]);
      await a.close();
      await b.close();
    }
  },
);
