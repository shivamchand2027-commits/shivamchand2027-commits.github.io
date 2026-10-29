import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  visible,
  project,
  validateProfile,
  verifiedPayment,
  signature,
  canRead,
  Serial,
  safeCell,
} from "../server/core.mjs";
import { candidate, ingest } from "../scripts/ingest.mjs";
import { MemoryStore } from "../server/store.mjs";
const row = {
  id: "a",
  publication: "approved",
  expiresAt: "2099-01-01",
  lastVerifiedAt: "2026-10-29",
  raisingStatus: "seeking",
  origin: "onboarded",
  publicationConsent: "yes",
  consentRef: "owner-grant",
};
test("private, stale and unconsented profiles fail closed", () => {
  assert(visible(row));
  for (const change of [
    { publication: "pending" },
    { expiresAt: "2020-01-01" },
    { publicationConsent: "" },
    { consentRef: "" },
    { raisingStatus: "closed" },
    { expiresAt: "invalid" },
    { lastVerifiedAt: "invalid" },
    { lastVerifiedAt: "2099-01-01" },
  ])
    assert(!visible({ ...row, ...change }));
});
test("public source requires approved permission and evidence", () => {
  const p = {
    ...row,
    origin: "public",
    sourceUrl: "https://example.org/",
    sourcePermission: "approved",
    sourceExcerpt: "Currently raising",
  };
  assert(visible(p));
  assert(!visible({ ...p, sourcePermission: "" }));
  assert(!visible({ ...p, sourceExcerpt: "" }));
});
test("projection strips private fields and source snippets", () => {
  const p = project({
    ...row,
    email: "private@example.org",
    deck: "secret",
    sourceExcerpt: "copied",
  });
  assert(!("email" in p));
  assert(!("deck" in p));
  assert(!("sourceExcerpt" in p));
});
const profile = {
  name: "Test investor",
  email: "test@example.org",
  phone: "+919876543210",
  firm: "Test office",
  country: "India",
  amount: 100000,
  currency: "INR",
  role: "HNI",
  whatsapp: true,
  consent: true,
};
test("all requested profile fields and explicit consent required", () => {
  assert.equal(validateProfile(profile).role, "HNI");
  for (const k of [
    "name",
    "email",
    "phone",
    "firm",
    "country",
    "amount",
    "role",
    "whatsapp",
    "consent",
  ])
    assert.throws(() => validateProfile({ ...profile, [k]: "" }));
  assert.throws(() => validateProfile({ ...profile, role: "UNHI" }));
});
test("signature and payment identity amount currency capture checked", () => {
  const s = "test-secret",
    body = "order_test|pay_test",
    sig = crypto.createHmac("sha256", s).update(body).digest("hex");
  assert(signature(s, body, sig));
  assert(!signature(s, body, sig + "a"));
  const o = {
      providerOrderId: "order_test",
      userId: "user",
      amount: 99900,
      currency: "INR",
    },
    p = {
      status: "captured",
      amount: 99900,
      currency: "INR",
      order_id: "order_test",
    };
  assert(verifiedPayment(p, o, "user"));
  for (const c of [
    { status: "authorized" },
    { amount: 49900 },
    { currency: "USD" },
    { order_id: "other" },
  ])
    assert(!verifiedPayment({ ...p, ...c }, o, "user"));
  assert(!verifiedPayment(p, o, "other"));
});
test("expired and revoked access denied", () => {
  assert(canRead({ status: "active", endsAt: "2099-01-01" }));
  assert(!canRead({ status: "active", endsAt: "2020-01-01" }));
  assert(!canRead({ status: "revoked", endsAt: "2099-01-01" }));
});
test("serial guard prevents simultaneous sheet writes", async () => {
  const q = new Serial(),
    a = [];
  await Promise.all([
    q.run(async () => {
      a.push(1);
      await new Promise((r) => setTimeout(r, 5));
      a.push(2);
    }),
    q.run(() => a.push(3)),
  ]);
  assert.deepEqual(a, [1, 2, 3]);
});
test("source discovery queues candidates, not automatic publish", () => {
  const c = candidate(
    { url: "https://example.org", name: "Example" },
    "<body>We are currently raising a seed round of INR50 lakh.</body>",
  );
  assert.equal(c.status, "needs_review");
  assert.equal(c.publication, undefined);
  const closed = candidate(
    { url: "https://example.org", name: "Example" },
    "<body>We raised a seed round last year.</body>",
  );
  assert.equal(closed.status, "no_active_raise_evidence");
});
test("no source permission means no scrape", async () => {
  const result = await ingest(
    [{ url: "http://127.0.0.1", enabled: true }],
    new MemoryStore(),
  );
  assert.deepEqual(result, []);
});
test("spreadsheet formulas escaped", () => {
  assert.equal(safeCell('=IMPORTXML("url")'), '\'=IMPORTXML("url")');
});
