# Backend notes

The site is static. Everything dynamic runs through one Google Apps Script web app (the `/exec` URL in `config.js`), bound to a Google Sheet.

![System map](images/system-map.svg)

## What the backend does

| Area | Behaviour |
| --- | --- |
| Invite codes | Validates codes server-side (`?action=checkref`). Founder codes are unlimited; member codes spend nominations. Retired codes are blocklisted in Settings. |
| Fee payment | The open (no-invite) lane pays Rs 499 via Razorpay before the application is accepted. The backend creates the order, verifies the signature, amount, currency and order ownership (order notes bind it to this site), captures an authorized payment server-side, and only a captured payment produces a ticket. Invite-code lane stays free. |
| Paid-state recovery | If payment succeeded but the submit died after it, re-submitting the same email and code reuses the stored payment within 6 hours instead of charging again. |
| Applications | `POST` from the form. Re-validates email and code, writes a Submissions row, decrements nominations, returns a ticket (ADYA-XXXXXX) and a personal referral code. Applying without a code works as a slower direct lane. |
| Acknowledgement | Sends an instant acknowledgement email on every application. |
| Deck scoring | Applications join a scoring queue; each deck is scored on a 100-point rubric (10 dimensions) with server-computed total and band, saved in a Scoring tab. |
| Status | `?action=status&email=...&ticket=...` returns the decision state plus the full score breakdown shown on the status page. |
| Decisions | Setting Decision in the Sheet triggers an approve or reject email within about 5 minutes (time-driven trigger). Rejections stay diplomatic, grant gold access, and invite a return. |
| Deck feedback | Every application is on a 14-16h detailed-feedback clock from final submit (both lanes). The 5-minute pipeline composes the rubric-based feedback email for scored decks and sends it with duplicate protection; the owner gets warning (14h) and urgent (16h) alerts with per-application reasons. |
| Sender hold | One global sticky hold gates every email path (ack, decisions, feedback, query auto-reply, owner alerts). It releases only through explicit controlled clearance, never on elapsed time; a quota/rate error trips it for the whole queue. Nothing held is logged as sent. |
| Execution health | Every tick stamps a heartbeat (Script Property: UTC time + scan counts); a frozen stamp means the trigger/auth/service failed. |
| Raise a query | The FAQ form posts a query that lands in a Queries tab and gets an auto-reply. |
| Nominations | `?action=nominations&code=...` lets a member watch their code's usage. An approved nominee earns the member +1 nomination back. |
| Email log | Every send is recorded so nobody is emailed twice. |

## Sheet tabs

Submissions, Scoring, Settings, Referrals, Queries, Email log. Edit values only, never the structure; delete whole rows only; never touch header row 1.

## Deploy rule

Every backend code change needs Deploy > Manage deployments > New version. Editing code without a new version changes nothing live.

## Feedback pipeline and sender hold (v15, Oct 27 2026)

- Clock: final submit (Submissions column A), both lanes, never restarts. States: SENT (Email log feedback row) / MISSING_DECK / NEEDS_SCORE / READY.
- Send safety: SENDING persisted before the provider call; crash recovery goes to SEND_AMBIGUOUS (manual reconciliation, never auto-resend); transient errors back off 15 minutes per ticket; permanent/ambiguous stop; quota/rate trips the global hold.
- Hold-first bootstrap: a fresh deployment sends nothing until `clearFeedbackSenderHold()` is run deliberately after the account's email restriction clears. The same function is the only way any tripped hold releases.
- Ack catch-up: ack emails suppressed under the hold carry a HELD marker in the Email log and send automatically after clearance; nothing else is re-emailed.
- Owner alerts: 14h warning / 16h urgent, one per application per stage, suppressed (not lost) while the hold is active.
- Concurrency: the tick runs under a script lock; overlapping triggers skip.

## Privacy notes

- No secrets, keys or sheet IDs live in this repo.
- Member pages are gated client-side (courtesy gate); treat their content as semi-public.
- Founders see only their own status and score, keyed by email + ticket.

## 31 October 2026: private Master Data Log

The existing private approval workbook now contains a `Master Data Log` tab. It links saved founder application records, decisions, payment fields, readiness scores and feedback audit entries by ticket. All original tabs and records are preserved; source tabs remain authoritative. It is a formula-driven operations view, not a new public database. No applicant/contact data is included in this repository.

At verification, it showed nine saved application records without formula errors. Historical/test rows remain historical/test records. The view currently pre-provisions 100 application rows and must be extended before that capacity is reached.

The tab explicitly marks investor contact/profile capture as not live and mobile as not stored by the current founder service. Marketing consent is not inferred. This documentation records the delivered Sheet change only, not the unshipped investor login, storage, directory or payment work. Email sending restrictions remain unchanged.
