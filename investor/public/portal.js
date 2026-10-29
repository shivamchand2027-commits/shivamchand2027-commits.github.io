"use strict";
const $ = (id) => document.getElementById(id);
let config = {},
  csrf = "",
  preview = false,
  selected = "",
  requestId = "",
  rows = [];
const api = async (path, body) => {
  const r = await fetch("/api/" + path, {
    credentials: "same-origin",
    headers: {
      ...(body
        ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
        : {}),
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "Request failed");
  return data;
};
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function card(r) {
  const n = el("article", undefined, "card");
  n.append(
    el(
      "span",
      r.origin === "demo"
        ? "ILLUSTRATIVE PREVIEW · NOT A REAL STARTUP"
        : r.origin === "onboarded"
          ? "FOUNDER-APPROVED PROFILE"
          : "PUBLIC SOURCE · NOT ONBOARDED",
      "badge",
    ),
    el("h3", r.name),
    el("p", r.industry + " · " + r.stage + " · " + r.country, "small"),
    el("p", r.summary),
    el(
      "p",
      "Funding ask: " +
        (r.ask ? r.ask + " " + r.askCurrency : "Not publicly disclosed"),
      "ask",
    ),
  );
  if (r.sourceUrl) {
    const a = el("a", "Read original source");
    a.href = r.sourceUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    n.append(a, el("p", "Last checked: " + r.lastVerifiedAt, "small"));
  }
  if (r.origin !== "public") {
    const b = el("button", "Show interest");
    b.addEventListener("click", () => openInterest(r));
    n.append(b);
  }
  return n;
}
function render() {
  const industry = $("industry").value,
    q = $("search").value.toLowerCase();
  const filtered = rows.filter(
    (x) =>
      (!industry || x.industry === industry) &&
      (!q ||
        [x.name, x.summary, x.industry].join(" ").toLowerCase().includes(q)),
  );
  $("startupGrid").replaceChildren(...filtered.map(card));
  $("count").textContent = filtered.length + " profiles";
  if (!filtered.length)
    $("startupGrid").append(
      el(
        "div",
        preview
          ? "No sample profiles match these filters."
          : "No publication-approved profiles are available yet. Founder applications and private decks are not automatically published.",
        "empty",
      ),
    );
}
async function enter() {
  $("auth").hidden = true;
  $("workspace").hidden = false;
  $("logout").hidden = false;
  if (preview) {
    $("logout").textContent = "Exit preview";
    rows = [
      {
        id: "demo-1",
        name: "Illustrative climate startup",
        industry: "Climate",
        country: "India",
        stage: "Seed",
        summary:
          "A sample card showing how a founder-approved profile and a clear funding ask will appear. This is not a live opportunity.",
        ask: "50 lakh",
        askCurrency: "INR",
        origin: "demo",
      },
      {
        id: "demo-2",
        name: "Illustrative SaaS startup",
        industry: "SaaS",
        country: "India",
        stage: "Pre-seed",
        summary:
          "A second sample for testing industry filters, the interest form and the mobile layout. No private founder information is used.",
        ask: "Not specified",
        askCurrency: "",
        origin: "demo",
      },
    ];
  } else {
    const d = await api("startups?lane=onboarded");
    rows = d.startups;
    const me = await api("me");
    csrf = me.csrf;
    if (me.access.active) {
      $("accessStatus").textContent =
        "Access active until " +
        new Date(me.access.endsAt).toLocaleDateString();
      $("subscribe").disabled = true;
      $("subscribe").textContent = "Your access is active";
      const pub = await api("startups?lane=public");
      const show = el("button", "Browse your funding directory");
      show.onclick = () => {
        rows = pub.startups;
        render();
        $("browse").scrollIntoView({ behavior: "smooth" });
      };
      $("publicGrid").hidden = false;
      $("publicGrid").replaceChildren(show);
    }
  }
  render();
}
function openInterest(r) {
  selected = r.id;
  requestId = crypto.randomUUID();
  $("interestForm").reset();
  $("interestTitle").textContent = "Interest in " + r.name;
  $("interestError").textContent = "";
  $("interestSubmit").textContent = preview
    ? "Preview submit (no data saved)"
    : "Submit interest";
  $("interestDialog").showModal();
}
$("industry").addEventListener("change", render);
$("search").addEventListener("input", render);
$("closeDialog").onclick = () => $("interestDialog").close();
$("successClose").onclick = () => $("successDialog").close();
$("previewExplore").onclick = () => enter();
$("logout").onclick = async () => {
  if (!preview) await api("logout", {});
  location.reload();
};
$("interestForm").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("interestSubmit");
  b.disabled = true;
  try {
    const f = Object.fromEntries(new FormData(e.target));
    const payload = {
      ...f,
      startupId: selected,
      requestId,
      amount: Number(f.amount),
      phone: f.phone.replace(/[\s()-]/g, ""),
      whatsapp: f.whatsapp === "on",
      consent: f.consent === "on",
    };
    if (!/^\+[1-9]\d{7,14}$/.test(payload.phone))
      throw Error("Use an international phone number such as +919876543210.");
    const result = preview
      ? { id: "Preview only. No interest or personal data was sent." }
      : await api("interests", payload);
    $("receipt").textContent = preview ? result.id : "Reference: " + result.id;
    $("interestDialog").close();
    $("successDialog").showModal();
  } catch (e) {
    $("interestError").textContent = e.message;
  } finally {
    b.disabled = false;
  }
};
$("subscribe").onclick = async () => {
  if (!config.checkoutEnabled || !$("terms").checked) return;
  try {
    const o = await api("orders", { termsVersion: config.termsVersion });
    const checkout = new Razorpay({
      key: o.key,
      order_id: o.orderId,
      amount: o.amount,
      currency: o.currency,
      name: "Adya Capital",
      description: "Funding research directory access",
      handler: async (p) => {
        sessionStorage.setItem(
          "adya_payment_recovery",
          JSON.stringify({
            orderId: o.orderId,
            paymentId: p.razorpay_payment_id,
            signature: p.razorpay_signature,
          }),
        );
        await confirmPayment();
      },
      modal: {
        ondismiss: () => {
          $("paymentStatus").textContent =
            "Checkout closed. If debited, do not pay again. Use payment confirmation or contact support.";
        },
      },
    });
    checkout.open();
  } catch (e) {
    $("paymentStatus").textContent = e.message;
  }
};
async function confirmPayment() {
  const saved = sessionStorage.getItem("adya_payment_recovery");
  if (!saved) return;
  try {
    await api("payments/verify", JSON.parse(saved));
    sessionStorage.removeItem("adya_payment_recovery");
    $("paymentStatus").textContent = "Payment verified. Access active.";
    await enter();
  } catch (e) {
    $("paymentStatus").textContent = e.message;
    const retry = el("button", "Retry confirmation (no new payment)");
    retry.onclick = confirmPayment;
    $("paymentStatus").append(document.createElement("br"), retry);
    $("subscribe").disabled = true;
  }
}
async function boot() {
  try {
    config = await api("config");
    preview = config.preview;
    $("previewNotice").hidden = config.live;
    if (preview) {
      $("authStatus").textContent =
        "Preview mode: no identity verification, registrations, interest submissions or charges. Google sign-in will be enabled only after server configuration is verified.";
      $("previewExplore").hidden = false;
      return;
    }
    if (!config.clientId) {
      $("authStatus").textContent =
        "Secure sign-in is not configured. Registration and payments are unavailable.";
      return;
    }
    try {
      const me = await api("me");
      csrf = me.csrf;
      await enter();
      await confirmPayment();
    } catch {
      const challenge = await api("auth/challenge");
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.onload = () => {
        google.accounts.id.initialize({
          client_id: config.clientId,
          nonce: challenge.nonce,
          callback: async (response) => {
            try {
              const r = await api("auth/google", {
                credential: response.credential,
              });
              csrf = r.csrf;
              await enter();
              await confirmPayment();
            } catch (e) {
              $("authStatus").textContent = e.message;
            }
          },
        });
        google.accounts.id.renderButton($("googleButton"), {
          theme: "outline",
          size: "large",
        });
        $("authStatus").textContent = "Sign in with Google to continue.";
      };
      document.head.append(script);
    }
    if (config.checkoutEnabled) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.head.append(script);
      $("terms").disabled = false;
      $("subscribe").disabled = false;
      $("subscribe").textContent = "Pay ₹999 for 30-day access";
      $("billingCopy").textContent =
        "₹999 total for 30 days. No automatic renewal. Review cancellation, refund and privacy terms before payment.";
    }
  } catch (e) {
    $("authStatus").textContent =
      "The service is unavailable. No data has been submitted.";
  }
}
boot();

document.getElementById("directoryDetails").onclick = () => {document.getElementById("directoryDetails").hidden=true;document.getElementById("directoryPrice").hidden=false;};
