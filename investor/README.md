# Adya investor desk - build preview

Status: tested local preview, NOT a live investor portal. No live login, founder publication, subscription, payment collection or production source scrape is enabled. Existing founder pages/backend remain unchanged.

## Requested journey
1. Google-backed sign-in, then self-declared investor category. HNI, seed investor and family office implemented; the requested UNHI label awaits clarification, not silently renamed.
2. Browse publication-approved onboarded profiles, filter by industry and search.
3. Show interest opens name, email, WhatsApp-number self-declaration, firm/office, country, ballpark amount/currency, category and contact consent.
4. Submit stores one idempotent interest and returns the requested team-contact popup. Preview clearly states no personal data was sent.
5. Separate Rs999/month directory, with industry-sorted source-reported open opportunities, ask when disclosed, source link and checked date. Billing model remains pending: the 30-day one-off adapter is held and is not an approved product decision. Recurring billing is not implemented yet.

## Run and verify
Node22+: `npm ci`, `npm test`, `PORTAL_PREVIEW=true npm start`. Open localhost8099. Visual smoke test: `node tests/visual.mjs` after `npx playwright install chromium`. Use `.env.example` for variable names only; never commit credentials.

11 unit/HTTP checks and a browser flow pass at the Oct29 build checkpoint. Checks cover field/consent validation, source publication/expiry, private-field exclusion, timing-safe HMAC, capture/amount/currency/order/user identity, access expiry/revocation, serialized writes, formula hardening, source permissions, forged-origin/unauthenticated requests, signed event replay and fail-closed preview. Browser checks cover 390px overflow, filtering, full interest form and popup. Dependency audit: zero known production vulnerabilities at this checkpoint. This does not replace a security review or end-to-end provider test.

## Data separation
A new PRIVATE Google Sheet is used, never the founder application ledger. Tabs: Investors, Interests, Startups, SourceQueue, Orders, Access, Events, Settings. `server/store.mjs` is the schema source. Application/server identity receives access only to this Sheet. No private contact details, decks, application records, credentials or Sheet identifiers belong in this public repository.

`Startups.publication=approved`, explicit consent reference for onboarded founders, active-seeking evidence and a finite future expiry are required. Public sources additionally require approved source permission, HTTPS source URL and evidence excerpt. The public projection excludes contact/deck/private source excerpts. Invalid or expired dates fail closed. A fundraising news article is not evidence that a round is open.

## Authentication and hosting
Static GitHub Pages cannot run this backend or store secrets. The Express service needs a proper HTTPS host, exact origin and verified Google web client. Server verifies Google token audience/signature/expiry, nonce and verified email; sessions use hashed random cookies with CSRF/origin checks. Categories and WhatsApp availability are self-declared, not KYC or external verification. A production host identity should access Sheets without exported service-account JSON keys.

Current storage adapter is SINGLE-INSTANCE only. In-process serialization and sessions are not a multi-instance lock/database. Do not scale replicas or run independent writers/scrapers against this adapter. Production payment launch requires transactional database/unique constraints or verified single-instance failure/restart recovery, quotas/load testing, backups and retention rules. Current collector must not run concurrently with another Sheet writer. No production SLA is claimed.

## Payment adapter and hold
Only server-created INR99900 orders can grant access. Checkout response signature is checked against stored order ID; provider API/captured payment and correct amount/currency/user/order must match. Raw webhook HMAC precedes JSON parsing; event ID replay protection, payment-id grant protection and refund/dispute tombstones prevent later out-of-order captures from restoring revoked access. A reconciliation endpoint queries existing order payments, without initiating a new charge. Browser stores callback recovery and offers confirmation retry, never tells a debited buyer to repay.

Billing is OFF by default. Preview can never enable live actions, even with conflicting flags. Pending launch gates: owner selects renewal model; final price/tax/cancellation/refund/privacy/retention/support terms; gateway account/product review; refund/dispute/checkout-loss/end-to-end sandbox tests; approved host and secrets; secure sign-in verification; legal review of fundraising scope. Existing callbacks/webhooks may reconcile previously authorized orders after a sales hold, but cannot create new orders. Partial refunds currently revoke the whole access grant, deliberately conservative and subject to approved policy. Subscription states are not treated as captured one-off payments.

## Source collection
`sources.json` is EMPTY until each source is reviewed. Each entry needs enabled, permissionApproved, robotsReviewed, allowedHost, HTTPS URL and name. `npm run ingest` collects candidates into SourceQueue with SHA256 content hash/observed date/excerpt. Exact-host allowlist, no redirects, rate pacing, fetch timeout and stop on403/429 are built in. No robots approval is inferred. Review must verify source rights, active raise, ask, industry, publication scope, checked date and expiry before copying an approved profile to Startups. Collection is a queue, not an automatic endorsement or publication engine. Production scheduling and first approved real sources are not active yet.

## Launch discipline
No securities orders, custody, pooling, promised returns or verified-investor claims. Nonbinding research/introduction preview does not by itself settle fundraising-platform rules. Preserve the requested fundraising outcome as held work, not silently replace it. Founder material remains private until explicit publication consent. No email send path was added and existing sender hold is unchanged.

Official technical references:
- https://razorpay.com/docs/webhooks/validate-test
- https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/best-practices/
- https://razorpay.com/docs/payments/subscriptions/subscribe-to-webhooks
- https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- https://developers.google.com/apps-script/guides/web
- https://www.sebi.gov.in/media/press-releases/aug-2016/sebi-cautions-investors_33094.html
