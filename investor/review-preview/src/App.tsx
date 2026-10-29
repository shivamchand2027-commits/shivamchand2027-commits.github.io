import React, { useState } from "react";
import { FileCard } from "@instinct/files";
import mark from "./mark-t.png";
import "./theme.css";
import "./portal.css";
import "./landing.css";
import "./style.css";
export function App() {
  const [role, R] = useState(""),
    [route, F] = useState(""),
    [step, S] = useState(0),
    [browse, B] = useState(false),
    [interest, I] = useState(false),
    [sent, T] = useState(false),
    [directory, D] = useState(false),
    [code, C] = useState(""),
    [err, E] = useState("");
  const stages =
    route === "invited"
      ? [
          "Complete founder details and deck on the existing application form.",
          "Submit with a valid invitation. No payment.",
          "Backend acceptance produces a review ticket. No application was submitted in this preview.",
        ]
      : [
          "Complete founder details and deck.",
          "Read the one-time ₹499 review fee details.",
          "Razorpay checkout would open here. No order or charge is created in this preview.",
          "Backend verifies payment and accepts the application before issuing a review ticket. No payment or ticket exists here.",
        ];
  function choose(r: string) {
    R(r);
    B(false);
    D(false);
    F("");
    S(0);
    setTimeout(
      () =>
        document
          .getElementById("journey")
          ?.scrollIntoView({ block: "start", behavior: "smooth" }),
      0,
    );
  }
  return (
    <FileCard>
      <div className="adya">
        <div className="bg" aria-hidden="true" />
        <header className="vhero short" hidden={!!role}>
          <div className="frame">
            <nav className="nav">
              <a
                className="logo"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  choose("");
                }}
              >
                <img
                  className="lmark"
                  src={mark}
                  alt=""
                  width="34"
                  height="34"
                />
                <span>
                  Adya
                  <br />
                  Capital
                </span>
              </a>
              <div className="links">
                <a href="#choose">Choose your path</a>
                <a href="#choose">Founder & investor entry</a>
                <a
                  href="https://adyacapital.me/status.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Existing application status ↗
                </a>
              </div>
            </nav>
            <div className="hero-body">
              <div>
                <p className="notice">
                  INTERACTIVE PREVIEW · No signups, applications or payments
                  accepted
                </p>
                <p className="kicker">Adya Capital</p>
                <h1 className="title">
                  The right room.
                  <br />
                  The right next step.
                </h1>
              </div>
              <p className="sub">
                Building something worth backing, or looking for your next
                founder conversation? Start with what brings you here.
              </p>
            </div>
          </div>
          <div className="corner tl">
            Access is earned,
            <br />
            never granted
          </div>
          <div className="corner tr">
            Founders
            <br />& investors
          </div>
        </header>
        <main className="wide">
          <section id="choose" hidden={!!role}>
            <p className="eyebrow">ONE ENTRY. TWO JOURNEYS.</p>
            <h2>What brings you to Adya?</h2>
            <div className="paths">
              <article className="card path">
                <p className="eyebrow">FOR FOUNDERS</p>
                <h2>I'm raising funds</h2>
                <p>
                  Bring your startup and deck to the application journey. An
                  invitation opens the door, not an investment promise.
                </p>
                <p className="cost">
                  A clear path from your deck to Committee review.
                </p>
                <button onClick={() => choose("founder")}>
                  Continue as founder →
                </button>
              </article>
              <article className="card path">
                <p className="eyebrow">FOR INVESTORS</p>
                <h2>I'm looking to invest</h2>
                <p>
                  HNI, UHNI, seed investor or family office. Explore approved
                  profiles and tell the team what interests you.
                </p>
                <p className="cost">
                  Discover founder conversations, by sector and stage.
                </p>
                <button onClick={() => choose("investor")}>
                  Continue as investor →
                </button>
              </article>
            </div>
          </section>
          {role && (
            <section id="journey" className="panel journey">
              <button className="back" onClick={() => choose("")}>
                ← Back to entry
              </button>
              {role === "founder" ? (
                <>
                  <p className="eyebrow">FOUNDER ENTRY</p>
                  <h2>Start with your invitation</h2>
                  <p className="notice">
                    Valid invitation: no review fee. Without an invitation: ₹499
                    one-time application review fee. Disclosed here before you
                    begin the form; collected after the completed form, before
                    acceptance for review. It does not buy admission or funding.
                  </p>
                  <p>
                    Walkthrough only. No real invitation is validated and no
                    application details are collected or saved.
                  </p>
                  <div className="paths">
                    <div>
                      <label>
                        Invitation code
                        <input
                          value={code}
                          onChange={(e) => C(e.target.value)}
                          placeholder="ADYA-XXXXX"
                        />
                      </label>
                      <button
                        onClick={() => {
                          if (!/^ADYA-[A-Z0-9]{5}$/i.test(code.trim())) {
                            E(
                              "Use the format ADYA-XXXXX. This is not real code validation.",
                            );
                            return;
                          }
                          E("");
                          F("invited");
                          S(0);
                        }}
                      >
                        Walk through invited route
                      </button>
                      <p role="alert">{err}</p>
                    </div>
                    <div>
                      <p>No invitation?</p>
                      <button
                        onClick={() => {
                          F("open");
                          S(0);
                        }}
                      >
                        Walk through open application
                      </button>
                      <p className="small">
                        ₹499 after the completed form, before acceptance for
                        review.
                      </p>
                    </div>
                  </div>
                  {route && (
                    <>
                      <hr />
                      <h3>
                        {route === "invited"
                          ? "Invited founder · No review fee"
                          : "Open application · ₹499 review fee"}
                      </h3>
                      <ol>
                        {stages.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ol>
                      <button
                        onClick={() => S(step + 1)}
                        disabled={step >= stages.length}
                      >
                        Preview next step
                      </button>
                      <p className="notice" role="status">
                        {step
                          ? stages[Math.min(step - 1, stages.length - 1)]
                          : "Walkthrough only. Nothing submitted or paid."}
                      </p>
                    </>
                  )}
                  <p className="small">
                    <a
                      href="https://adyacapital.me/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open existing founder application ↗
                    </a>{" "}
                    ·{" "}
                    <a
                      href="https://adyacapital.me/status.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Check existing application status ↗
                    </a>
                    <br />
                    These links open the existing live founder site, outside
                    this preview.
                  </p>
                </>
              ) : (
                <>
                  <p className="eyebrow">INVESTOR ENTRY</p>
                  <h2>One account. A simpler return.</h2>
                  <p>
                    First visit: secure sign-in → short profile → startups.
                    Returning: sign in → startups. HNI / UHNI / Seed Investor /
                    Family Office are profile categories, not separate logins.
                  </p>
                  <p className="notice">
                    Secure sign-in is not live here. No account or saved profile
                    is created. UHNI label awaits clarification.
                  </p>
                  <p>
                    Onboarded startup browsing and expressing interest are free.
                  </p>
                  <button onClick={() => B(true)}>
                    Explore sample investor journey
                  </button>
                  <p>
                    <button className="btn glass" onClick={() => D(true)}>
                      Explore wider funding directory →
                    </button>
                  </p>
                  {browse && (
                    <>
                      <hr />
                      <h2>Onboarded startups · Sample only</h2>
                      <p>
                        No real startup, private founder deck or contact is
                        shown.
                      </p>
                      <article className="card">
                        <p className="eyebrow">
                          ILLUSTRATIVE SAMPLE · NOT A REAL STARTUP
                        </p>
                        <h3>Illustrative climate startup</h3>
                        <p>Climate · Seed · India</p>
                        <p>A sample founder-approved profile layout.</p>
                        <p>Funding ask: 50 lakh INR · illustrative only</p>
                        <button
                          onClick={() => {
                            I(true);
                            T(false);
                          }}
                        >
                          Show interest
                        </button>
                      </article>
                      {interest && (
                        <section className="panel journey">
                          <h3>Interest form preview</h3>
                          <p>
                            Name, email, WhatsApp number, firm, country and
                            indicative amount would be confirmed here, with the
                            contact handoff explained. Saved profile details
                            would prefill the form.
                          </p>
                          <p className="small">
                            No personal details are collected in this hosted
                            walkthrough.
                          </p>
                          <button onClick={() => T(true)}>
                            Preview confirmation
                          </button>
                          {sent && (
                            <p role="status">
                              Team shall get in touch with you.
                              <br />
                              <strong>
                                Preview only. No interest, contact details or
                                request was sent.
                              </strong>
                            </p>
                          )}
                        </section>
                      )}
                    </>
                  )}
                  {directory && (
                    <section className="panel journey">
                      <h3>Explore more startups seeking funding</h3>
                      <p>
                        Optional extra directory. No interest submission
                        required. ₹999 monthly access, after coverage and
                        billing/refund terms are shown.
                      </p>
                      <p>
                        Razorpay → server-confirmed payment → directory unlock.
                        Returning active access is not charged again.
                      </p>
                      <button disabled>Payment not available in preview</button>
                      <p className="small">
                        Renewal model and final terms are pending. No checkout
                        or real directory is active.
                      </p>
                    </section>
                  )}
                </>
              )}
            </section>
          )}
        </main>
        <footer>
          Adya Capital · Review preview only
          <p>
            No investment order, guaranteed funding, registration or payment.
            Founder and investor permissions remain separate.
          </p>
        </footer>
      </div>
    </FileCard>
  );
}
