import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
test("server endpoints reject unauthenticated actions, forged origins and webhooks; preview cannot turn live", async () => {
  const server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: "8101",
      PORTAL_PREVIEW: "true",
      PORTAL_LIVE: "true",
      PORTAL_ORIGIN: "http://127.0.0.1:8101",
      RAZORPAY_WEBHOOK_SECRET: "only-local-test-secret",
    },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      try {
        if ((await fetch("http://127.0.0.1:8101/health")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(ready);
    const base = "http://127.0.0.1:8101";
    const cfg = await (await fetch(base + "/api/config")).json();
    assert.equal(cfg.live, false);
    assert.equal(cfg.checkoutEnabled, false);
    for (const path of ["me", "startups?lane=public", "orders/status"])
      assert.equal((await fetch(base + "/api/" + path)).status, 401);
    for (const path of ["orders", "interests", "payments/verify", "profile"])
      assert.equal(
        (
          await fetch(base + "/api/" + path, {
            method: "POST",
            headers: { Origin: base, "Content-Type": "application/json" },
            body: "{}",
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await fetch(base + "/api/orders", {
          method: "POST",
          headers: { Origin: "https://untrusted.invalid" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/auth/google", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/webhooks/razorpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      400,
    );
    const body = JSON.stringify({
        event: "refund.processed",
        payload: { refund: { entity: { payment_id: "local_refund_test" } } },
      }),
      sig = crypto
        .createHmac("sha256", "only-local-test-secret")
        .update(body)
        .digest("hex");
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await fetch(base + "/api/webhooks/razorpay", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-razorpay-signature": sig,
              "x-razorpay-event-id": "local_event_test",
            },
            body,
          })
        ).status,
        200,
      );
    const r = await fetch(base + "/api/config");
    assert.match(r.headers.get("content-security-policy"), /object-src 'none'/);
    assert.equal(r.headers.get("cache-control"), "no-store");
  } finally {
    server.kill();
    await new Promise((r) => server.once("exit", r));
  }
});
