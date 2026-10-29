"use strict";
const byId = (id) => document.getElementById(id);
function open(id) {
  document.querySelector("header").hidden = true;
  byId("choose").hidden = true;
  for (const x of ["founder", "investorEntry"]) byId(x).hidden = x !== id;
  const section = byId(id);
  section.focus();
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}
byId("chooseFounder").onclick = () => open("founder");
byId("chooseInvestor").onclick = () => open("investorEntry");
let stage = 0,
  invited = false;
function route(withInvite) {
  invited = withInvite;
  stage = 0;
  byId("founderSteps").hidden = false;
  byId("founderRoute").textContent = invited
    ? "Invited founder · No review fee"
    : "Open application · ₹499 review fee";
  byId("founderSequence").replaceChildren(
    ...(invited
      ? [
          "Complete founder details and deck",
          "Submit invitation-backed application",
          "Receive ticket only after backend acceptance",
          "Committee review and application status",
        ]
      : [
          "Complete founder details and deck",
          "Review the one-time ₹499 fee terms",
          "Razorpay checkout",
          "Backend verifies payment and accepts application",
          "Receive ticket, then Committee review",
        ]
    ).map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      return li;
    }),
  );
  byId("founderNext").disabled = false;
  byId("founderNext").textContent = "Preview next step";
  byId("founderState").textContent =
    "Walkthrough only. No application details are collected or saved.";
  byId("founderSteps").scrollIntoView({ behavior: "smooth", block: "center" });
}
byId("invited").onclick = () => {
  byId("codeError").textContent = "";
  if (!/^ADYA-[A-Z0-9]{5}$/i.test(byId("founderCode").value.trim())) {
    byId("codeError").textContent =
      "Enter the code format ADYA-XXXXX for this walkthrough. No real invitation is validated here.";
    return;
  }
  route(true);
};
byId("openFounder").onclick = () => route(false);
byId("founderNext").onclick = () => {
  const steps = invited
    ? [
        "Step1: Complete founder details and deck on the existing application form.",
        "Step2: Submit with a valid invitation. No payment is required.",
        "Step3: Backend acceptance produces a ticket for Committee review. This preview has NOT submitted an application.",
      ]
    : [
        "Step1: Complete founder details and deck before payment.",
        "Step2: Read the one-time ₹499 review fee details. This is not admission or a funding guarantee.",
        "Step3: Razorpay checkout would open here. This preview does NOT create an order or charge money.",
        "Step4: Backend must verify payment and accept the application before issuing a ticket. No payment or ticket exists in this walkthrough.",
      ];
  byId("founderState").textContent = steps[stage++];
  if (stage >= steps.length) {
    byId("founderNext").disabled = true;
    byId("founderNext").textContent = "Walkthrough complete";
  }
};

document.querySelectorAll(".backEntry").forEach(
  (b) =>
    (b.onclick = () => {
      document.querySelector("header").hidden = false;
      byId("choose").hidden = false;
      byId("founder").hidden = true;
      byId("investorEntry").hidden = true;
      window.scrollTo(0, 0);
    }),
);
