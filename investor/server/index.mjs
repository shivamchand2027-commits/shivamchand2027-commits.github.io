import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OAuth2Client } from "google-auth-library";
import {
  PRICE,
  ROLES,
  hash,
  equal,
  signature,
  validateProfile,
  visible,
  project,
  canRead,
  verifiedPayment,
  Serial,
  clean,
} from "./core.mjs";
import { SheetStore, MemoryStore } from "./store.mjs";
import { PostgresStore } from "./postgres.mjs";
const app = express(),
  env = process.env,
  preview = env.PORTAL_PREVIEW === "true",
  origin = env.PORTAL_ORIGIN || "http://127.0.0.1:8099",
  clientId = env.GOOGLE_CLIENT_ID || "",
  enabled = !preview && env.PORTAL_LIVE === "true",
  billing = env.BILLING_MODE || "pending",
  termsVersion = env.TERMS_VERSION || "",
  store = env.DATABASE_URL
    ? new PostgresStore(env.DATABASE_URL)
    : env.INVESTOR_SHEET_ID
      ? new SheetStore(env.INVESTOR_SHEET_ID)
      : new MemoryStore(),
  serial = env.DATABASE_URL
    ? { run: (fn) => store.transaction(fn) }
    : new Serial(),
  sessions = new Map(),
  loginChallenges = new Map(),
  google = new OAuth2Client(clientId),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!preview && (!env.INVESTOR_SHEET_ID || !clientId))
  console.warn("Portal is fail-closed: server configuration missing.");
app.disable("x-powered-by");
if (env.EDGE_MODE === "true")
  app.use((req, res, next) => {
    const prefix = env.FUNCTION_PREFIX || "/adya-investor";
    if (req.url.startsWith(prefix))
      req.url = req.url.slice(prefix.length) || "/";
    next();
  });
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://checkout.razorpay.com",
        ],
        frameSrc: [
          "https://accounts.google.com",
          "https://api.razorpay.com",
          "https://*.razorpay.com",
        ],
        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://api.razorpay.com",
          "https://*.razorpay.com",
        ],
        imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);
app.use(cookieParser());
app.use(
  "/api",
  env.DATABASE_URL
    ? async (req, res, next) => {
        try {
          if (!(await store.rateHit(hash(req.ip || "unknown"))))
            return res
              .status(429)
              .json({ error: "Too many requests. Wait a minute." });
          next();
        } catch {
          res.status(503).json({ error: "Service temporarily unavailable" });
        }
      }
    : rateLimit({
        windowMs: 60000,
        limit: 45,
        standardHeaders: "draft-8",
        legacyHeaders: false,
      }),
);
const id = () => crypto.randomUUID(),
  now = () => new Date().toISOString(),
  cookieOptions = {
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "strict",
    path: "/api",
    maxAge: 8 * 3600000,
  };
async function provider(url, method = "GET", body) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET)
    throw new Error("Payment configuration unavailable");
  const r = await fetch("https://api.razorpay.com/v1/" + url, {
    method,
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET,
        ).toString("base64"),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok)
    throw new Error("Payment provider unavailable; no access change made");
  return r.json();
}
async function grant(userId, paymentId) {
  const all = await store.all("Access");
  const existing = all.find((x) => x.paymentId === paymentId);
  if (existing) return existing.status;
  const active = all
    .filter((x) => x.userId === userId && x.status === "active")
    .map((x) => Date.parse(x.endsAt))
    .filter(Number.isFinite);
  const start = Math.max(Date.now(), ...active);
  await store.put("Access", {
    id: id(),
    userId,
    paymentId,
    startsAt: now(),
    endsAt: new Date(start + 30 * 86400000).toISOString(),
    status: "active",
    providerSubscriptionId: "",
  });
  return "active";
}
// Raw body and event IDs must be checked before JSON parsing. All processing is serialized for this single-instance deployment.
app.post(
  "/api/webhooks/razorpay",
  express.raw({ type: "application/json", limit: "512kb" }),
  async (req, res) => {
    try {
      if (
        !env.RAZORPAY_WEBHOOK_SECRET ||
        !signature(
          env.RAZORPAY_WEBHOOK_SECRET,
          req.body,
          req.get("x-razorpay-signature") || "",
        )
      )
        return res.sendStatus(400);
      const eventId = req.get("x-razorpay-event-id");
      if (!eventId) return res.sendStatus(400);
      const e = JSON.parse(req.body.toString());
      await serial.run(async () => {
        if ((await store.all("Events")).some((x) => x.providerRef === eventId))
          return;
        const p = e.payload?.payment?.entity;
        if (e.event === "payment.captured" && p) {
          const order = (await store.all("Orders")).find(
            (o) => o.providerOrderId === p.order_id,
          );
          if (
            order &&
            verifiedPayment(
              p,
              { ...order, amount: Number(order.amount) },
              order.userId,
            ) &&
            order.billingMode === "pass30"
          ) {
            await grant(order.userId, p.id);
            await store.put("Orders", {
              ...order,
              state: "captured",
              paymentId: p.id,
            });
          }
        }
        if (["refund.processed", "payment.dispute.created"].includes(e.event)) {
          const paymentId =
            e.payload?.refund?.entity?.payment_id ||
            e.payload?.dispute?.entity?.payment_id;
          if (paymentId) {
            const matches = (await store.all("Access")).filter(
              (a) => a.paymentId === paymentId,
            );
            if (matches.length) {
              for (const a of matches)
                await store.put("Access", { ...a, status: "revoked" });
            } else
              await store.put("Access", {
                id: id(),
                userId: "",
                paymentId,
                startsAt: now(),
                endsAt: now(),
                status: "revoked",
                providerSubscriptionId: "",
              });
          }
        }
        await store.put("Events", {
          id: id(),
          type: e.event,
          providerRef: eventId,
          createdAt: now(),
          result: "processed",
        });
      });
      res.json({ ok: true });
    } catch {
      res.sendStatus(503);
    }
  },
);
app.use(express.json({ limit: "32kb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    ["POST", "DELETE", "PUT"].includes(req.method) &&
    req.get("origin") !== origin
  )
    return res.status(403).json({ error: "Origin rejected" });
  next();
});
app.get("/api/config", (req, res) =>
  res.json({
    clientId,
    preview,
    live: enabled,
    price: PRICE,
    currency: "INR",
    billingMode: billing,
    roles: ROLES,
    termsVersion,
    checkoutEnabled:
      enabled &&
      !!env.DATABASE_URL &&
      billing === "pass30" &&
      !!termsVersion &&
      !!env.RAZORPAY_KEY_ID,
    notice:
      "Self-declared categories. Sign-in does not verify investor status.",
  }),
);
app.get("/api/auth/challenge", async (req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  if (env.DATABASE_URL)
    await store.authPut("nonce", hash(token), {}, Date.now() + 300000);
  else loginChallenges.set(hash(token), Date.now() + 300000);
  res.cookie("adya_login", token, { ...cookieOptions, maxAge: 300000 });
  res.json({ nonce: hash(token) });
});
app.post("/api/auth/google", async (req, res) => {
  try {
    const token = req.cookies.adya_login,
      key = hash(token || "");
    const challenge = env.DATABASE_URL
      ? await store.authGet("nonce", key)
      : loginChallenges.get(key) > Date.now();
    if (!token || !challenge)
      return res.status(403).json({ error: "Start sign-in again" });
    if (!enabled || !clientId) throw Error();
    const ticket = await google.verifyIdToken({
        idToken: req.body.credential,
        audience: clientId,
      }),
      p = ticket.getPayload();
    if (p.nonce !== key || !p.sub || !p.email_verified) throw Error();
    if (env.DATABASE_URL) {
      if (!(await store.authConsume("nonce", key))) throw Error();
    } else loginChallenges.delete(key);
    const userId = hash("google:" + p.sub),
      session = crypto.randomBytes(32).toString("hex"),
      csrf = crypto.randomBytes(32).toString("hex");
    const sessionData = {
      userId,
      email: p.email,
      subject: p.sub,
      csrf,
      expires: Date.now() + 8 * 3600000,
    };
    if (env.DATABASE_URL)
      await store.authPut(
        "session",
        hash(session),
        sessionData,
        sessionData.expires,
      );
    else sessions.set(hash(session), sessionData);
    res.cookie("adya_session", session, cookieOptions);
    res.clearCookie("adya_login", { path: "/api" });
    res.json({ ok: true, csrf, email: p.email });
  } catch {
    res.status(401).json({ error: "Could not verify Google sign-in" });
  }
});
app.use("/api", async (req, res, next) => {
  const sessionKey = hash(req.cookies.adya_session || "");
  const s = env.DATABASE_URL
    ? await store.authGet("session", sessionKey)
    : sessions.get(sessionKey);
  if (!s || s.expires < Date.now())
    return res.status(401).json({ error: "Sign in to continue" });
  if (req.method !== "GET" && !equal(s.csrf, req.get("x-csrf-token") || ""))
    return res.status(403).json({ error: "Session check failed" });
  req.session = s;
  next();
});
app.get("/api/me", async (req, res) => {
  const p = (await store.all("Investors")).find(
      (x) => x.id === req.session.userId,
    ),
    access = (await store.all("Access"))
      .filter((x) => x.userId === req.session.userId && canRead(x))
      .sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0];
  res.json({
    email: req.session.email,
    csrf: req.session.csrf,
    profile: p || null,
    access: { active: canRead(access), endsAt: access?.endsAt || null },
  });
});
app.post("/api/logout", async (req, res) => {
  const sessionKey = hash(req.cookies.adya_session || "");
  if (env.DATABASE_URL) await store.authDelete("session", sessionKey);
  else sessions.delete(sessionKey);
  res.clearCookie("adya_session", { path: "/api" });
  res.json({ ok: true });
});
app.post("/api/profile", async (req, res) => {
  try {
    if (!enabled)
      return res
        .status(503)
        .json({ error: "Preview only. Registration is not live." });
    const p = validateProfile(req.body);
    await serial.run(async () => {
      const existing = (await store.all("Investors")).find(
        (x) => x.id === req.session.userId,
      );
      await store.put("Investors", {
        ...p,
        id: req.session.userId,
        subject: req.session.subject,
        createdAt: existing?.createdAt || now(),
        updatedAt: now(),
      });
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get("/api/startups", async (req, res) => {
  const lane = req.query.lane === "public" ? "public" : "onboarded";
  if (lane === "public") {
    const a = (await store.all("Access")).find(
      (x) => x.userId === req.session.userId && canRead(x),
    );
    if (!a)
      return res
        .status(402)
        .json({ error: "Active directory access required" });
  }
  const rows = (await store.all("Startups"))
    .filter((r) => r.origin === lane && visible(r))
    .map(project);
  res.json({ startups: rows, count: rows.length });
});
app.post("/api/interests", async (req, res) => {
  try {
    if (!enabled)
      return res
        .status(503)
        .json({ error: "Preview only. No interest will be submitted." });
    const p = validateProfile(req.body),
      startup = (await store.all("Startups")).find(
        (x) =>
          x.id === req.body.startupId && x.origin === "onboarded" && visible(x),
      );
    if (!startup)
      return res
        .status(404)
        .json({ error: "This startup is not available for introductions" });
    const requestId = clean(req.body.requestId, 100);
    if (!/^[\w-]{16,100}$/.test(requestId))
      throw Error("Refresh the form and try again");
    const result = await serial.run(async () => {
      const old = (await store.all("Interests")).find(
        (x) => x.userId === req.session.userId && x.requestId === requestId,
      );
      if (old) return old;
      return store.put("Interests", {
        ...p,
        id: id(),
        requestId,
        userId: req.session.userId,
        startupId: startup.id,
        createdAt: now(),
        status: "new",
      });
    });
    res.json({
      ok: true,
      id: result.id,
      message: "Team shall get in touch with you.",
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/orders", async (req, res) => {
  try {
    if (
      !enabled ||
      !env.DATABASE_URL ||
      billing !== "pass30" ||
      !termsVersion ||
      req.body.termsVersion !== termsVersion
    )
      return res
        .status(503)
        .json({ error: "Billing terms are not approved for launch" });
    if (
      (await store.all("Access")).some(
        (a) => a.userId === req.session.userId && canRead(a),
      )
    )
      return res
        .status(409)
        .json({ error: "Access is already active. Do not pay again." });
    const order = await serial.run(async () => {
      if (
        (await store.all("Access")).some(
          (a) => a.userId === req.session.userId && canRead(a),
        )
      )
        throw Error("Access is already active. Do not pay again.");
      const pending = (await store.all("Orders")).find(
        (o) => o.userId === req.session.userId && o.state === "created",
      );
      if (pending) return pending;
      const r = await provider("orders", "POST", {
        amount: PRICE,
        currency: "INR",
        receipt: "adyadir_" + id().slice(0, 20),
        notes: { product: "adya_directory", user_id: req.session.userId },
      });
      return store.put("Orders", {
        id: id(),
        userId: req.session.userId,
        providerOrderId: r.id,
        amount: PRICE,
        currency: "INR",
        createdAt: now(),
        state: "created",
        paymentId: "",
        billingMode: "pass30",
        termsVersion,
      });
    });
    res.json({
      orderId: order.providerOrderId,
      amount: PRICE,
      currency: "INR",
      key: env.RAZORPAY_KEY_ID,
    });
  } catch (e) {
    res.status(503).json({ error: e.message });
  }
});
app.post("/api/payments/verify", async (req, res) => {
  try {
    if (!env.RAZORPAY_KEY_SECRET)
      return res.status(503).json({
        error: "Confirmation unavailable. Do not pay again; contact support.",
      });
    const { orderId, paymentId, signature: sig } = req.body;
    const order = (await store.all("Orders")).find(
      (x) => x.providerOrderId === orderId && x.userId === req.session.userId,
    );
    if (
      !order ||
      order.billingMode !== "pass30" ||
      !signature(
        env.RAZORPAY_KEY_SECRET || "",
        order.providerOrderId + "|" + paymentId,
        sig,
      )
    )
      return res.status(400).json({
        error:
          "Payment could not be verified. Do not pay again; contact support.",
      });
    const p = await provider("payments/" + encodeURIComponent(paymentId));
    if (
      !verifiedPayment(
        p,
        { ...order, amount: Number(order.amount) },
        req.session.userId,
      )
    )
      return res.status(409).json({
        error:
          "Payment is not yet captured. Do not pay again; access will reconcile after capture.",
      });
    const state = await serial.run(async () => {
      const state = await grant(req.session.userId, p.id);
      await store.put("Orders", {
        ...order,
        state: "captured",
        paymentId: p.id,
      });
      return state;
    });
    if (state !== "active")
      return res.status(409).json({
        error:
          "This payment has a refund or dispute hold. Do not pay again; contact support.",
      });
    res.json({ ok: true });
  } catch {
    res.status(503).json({
      error:
        "Confirmation interrupted. Do not pay again; retry confirmation or contact support.",
    });
  }
});
app.get("/api/orders/status", async (req, res) => {
  try {
    const orders = (await store.all("Orders"))
      .filter(
        (o) => o.userId === req.session.userId && o.billingMode === "pass30",
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    const o = orders[0];
    if (!o) return res.json({ state: "none" });
    const result = await serial.run(async () => {
      const data = await provider(
        "orders/" + encodeURIComponent(o.providerOrderId) + "/payments",
      );
      const p = data.items?.find((p) =>
        verifiedPayment(
          p,
          { ...o, amount: Number(o.amount) },
          req.session.userId,
        ),
      );
      if (p) {
        await grant(req.session.userId, p.id);
        await store.put("Orders", { ...o, state: "captured", paymentId: p.id });
        return "captured";
      }
      return o.state;
    });
    res.json({
      state: result,
      orderId: o.providerOrderId,
      doNotPayAgain: result !== "failed",
    });
  } catch {
    res.status(503).json({
      error: "Could not reconcile payment. Do not pay again; contact support.",
    });
  }
});
app.use("/api", (req, res) => res.status(404).json({ error: "Not found" }));
if (env.EDGE_MODE !== "true")
  app.use(express.static(path.join(root, "public")));
app.get("/health", (req, res) =>
  res.json({ ok: true, preview, live: enabled, billing }),
);
if (store.ready) await store.ready;
app.listen(env.PORT || 8099, env.HOST || "127.0.0.1", () =>
  console.log("Portal preview available on localhost:" + (env.PORT || 8099)),
);
setInterval(() => {
  if (env.DATABASE_URL) store.cleanExpiredAuth().catch(() => {});
  for (const [k, v] of sessions) if (v.expires < Date.now()) sessions.delete(k);
  for (const [k, v] of loginChallenges)
    if (v < Date.now()) loginChallenges.delete(k);
}, 60000).unref();
