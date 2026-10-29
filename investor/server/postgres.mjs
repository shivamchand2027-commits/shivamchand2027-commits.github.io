// Transactional canonical store. Sheets remains a private review/export surface.
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { COLUMNS } from "./store.mjs";
export class PostgresStore {
  constructor(connectionString) {
    this.pool = new pg.Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
    });
    this.ctx = new AsyncLocalStorage();
    this.ready = this.init();
  }
  async init() {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT pg_advisory_xact_lock($1)", [427512354]);
      await c.query("CREATE SCHEMA IF NOT EXISTS adya_portal");
      await c.query("REVOKE ALL ON SCHEMA adya_portal FROM PUBLIC");
      await c.query(
        `CREATE TABLE IF NOT EXISTS adya_portal.records (tab text NOT NULL,id text NOT NULL,data jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tab,id))`,
      );
      await c.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS adya_access_payment_unique ON adya_portal.records ((data->>'paymentId')) WHERE tab='Access' AND data->>'paymentId'<>''`,
      );
      await c.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS adya_order_provider_unique ON adya_portal.records ((data->>'providerOrderId')) WHERE tab='Orders' AND data->>'providerOrderId'<>''`,
      );
      await c.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS adya_event_provider_unique ON adya_portal.records ((data->>'providerRef')) WHERE tab='Events' AND data->>'providerRef'<>''`,
      );
      await c.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS adya_interest_request_unique ON adya_portal.records ((data->>'userId'),(data->>'requestId')) WHERE tab='Interests'`,
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  check(tab) {
    if (!Object.hasOwn(COLUMNS, tab)) throw Error("Unknown table");
  }
  async all(tab) {
    this.check(tab);
    await this.ready;
    const r = await (this.ctx.getStore() || this.pool).query(
      "SELECT data FROM adya_portal.records WHERE tab=$1 ORDER BY id",
      [tab],
    );
    return r.rows.map((r) => r.data);
  }
  async put(tab, row) {
    this.check(tab);
    await this.ready;
    if (!row.id) throw Error("Record ID required");
    await (this.ctx.getStore() || this.pool).query(
      "INSERT INTO adya_portal.records(tab,id,data) VALUES($1,$2,$3) ON CONFLICT(tab,id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()",
      [tab, row.id, JSON.stringify(row)],
    );
    return row;
  }
  async transaction(fn) {
    await this.ready;
    if (this.ctx.getStore()) return fn();
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SET LOCAL lock_timeout='10s'");
      await c.query("SELECT pg_advisory_xact_lock($1)", [427512353]);
      const result = await this.ctx.run(c, fn);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async close() {
    await this.pool.end();
  }
}
