# Changelog

## October 22, 2026

### Open-lane Rs 499 application fee (Razorpay Standard Checkout)

- The "Apply anyway" (no-invite) journey now collects a one-time Rs 499 review fee before submission; invited founders apply free (backend-enforced, not just frontend copy).
- Razorpay Standard Checkout: order created server-side (Apps Script createfeeorder), checkout.js modal (UPI/cards/netbanking), backend verifies HMAC-SHA256(order_id|payment_id) signature + payment status via Razorpay API + rejects reused payment ids BEFORE writing the application.
- Razorpay keys live in Apps Script Script Properties (RZP_KEY_ID/RZP_KEY_SECRET); only the publishable key_id is in config.js. Secrets never in git.
- Submissions sheet gained columns N-Q: Fee INR, Fee method, UTR / payment ref, Fee status (auto-seeded).
- UPI-UTR manual bridge retained as a hidden fallback (provider switch in config.js).
- Fee mode flag in Code.gs: FEE_MODE 'soft' pre-live, 'enforce' once live keys are in.
- Backend v12 deployed with TEST keys (order creation verified live: test order created successfully from the deployed web app). End-to-end click-test payment: IN PROGRESS. Live keys after Razorpay KYC clears (1-2 business days).

- SEO fix (Google Search Console: "Excluded by noindex"): Founder Academy (padhai), Fund Vault, Communities and FAQ all carried `noindex,follow` while sitemap.xml listed them and robots.txt Disallowed two of them - contradictory. All four pages are now `index,follow,max-image-preview:large` with self-referencing canonical URLs; robots.txt now allows the whole site; sitemap lastmod bumped. Homepage was already correct; "/index.html -> /" canonical consolidation is expected behavior.

## October 17, 2026

- Mobile polish: nav links are ~40px tap targets, chips 42px, vault and Academy pills enlarged, micro text bumped (corner labels 10.5px, community tags 11px), communities rows stack on small screens. Verified at 360/390/412px with zero horizontal overflow on all five pages.
