# Backend notes

The site is static. Everything dynamic runs through one Google Apps Script web app (the `/exec` URL in `config.js`), bound to a Google Sheet.

## What the backend does

| Area | Behaviour |
| --- | --- |
| Invite codes | Validates codes server-side (`?action=checkref`). Founder codes are unlimited; member codes spend nominations. Retired codes are blocklisted in Settings. |
| Applications | `POST` from the form. Re-validates email and code, writes a Submissions row, decrements nominations, returns a ticket (ADYA-XXXXXX) and a personal referral code. Applying without a code works as a slower direct lane. |
| Acknowledgement | Sends an instant acknowledgement email on every application. |
| Deck scoring | Applications join a scoring queue; each deck is scored on a 100-point rubric (10 dimensions) with server-computed total and band, saved in a Scoring tab. |
| Status | `?action=status&email=...&ticket=...` returns the decision state plus the full score breakdown shown on the status page. |
| Decisions | Setting Decision in the Sheet triggers an approve or reject email within about 5 minutes (time-driven trigger). Rejections stay diplomatic, grant gold access, and invite a return. |
| Deck feedback | A detailed feedback email goes through an admin-gated endpoint, with duplicate protection. |
| Raise a query | The FAQ form posts a query that lands in a Queries tab and gets an auto-reply. |
| Nominations | `?action=nominations&code=...` lets a member watch their code's usage. An approved nominee earns the member +1 nomination back. |
| Email log | Every send is recorded so nobody is emailed twice. |

## Sheet tabs

Submissions, Scoring, Settings, Referrals, Queries, Email log. Edit values only, never the structure; delete whole rows only; never touch header row 1.

## Deploy rule

Every backend code change needs Deploy > Manage deployments > New version. Editing code without a new version changes nothing live.

## Privacy notes

- No secrets, keys or sheet IDs live in this repo.
- Member pages are gated client-side (courtesy gate); treat their content as semi-public.
- Founders see only their own status and score, keyed by email + ticket.
