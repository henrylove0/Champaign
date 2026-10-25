# Naya website integration

Champaign is a separate application and repository. Keep the portfolio and booking workspace independently deployable.

Verified prototype: **https://champaign-six.vercel.app/**. Repository: https://github.com/henrylove0/Champaign . It is public demo software with fictional commercial terms, not a live booking service.

## Recommended first connection

1. Build this repository with `npm ci && npm run build`.
2. Host `dist/` as a static app on its own free hosting project. No functions, database, or secrets are needed for this prototype.
3. After verifying the deployment, connect `book.nayaralima.com` to that project if the domain owner chooses it. This is a proposed hostname, not a configured one.
4. Add a **Plan a campaign / Planejar campanha** link from Naya's portfolio to the verified booking URL. No iframe is required. Hash navigation keeps this prototype portable across static hosts and subdirectories.

The exact prototype link target can be the verified URL above and should be clearly labeled as a demo. This task does not mutate the portfolio's CMS manifest, authentication, R2 storage, deployment project, or DNS.

## Embedding later

An iframe is possible only if the booking host permits it and its storage/browser restrictions are understood. A direct link or custom subdomain is simpler for the prototype. Do not share the portfolio's single administrator password with campaign participants or reuse its admin session as a participant account.

## Real multi-party operation

The present browser-local demo must be replaced before collecting actual booking data:

- A global person profile can join multiple campaigns with explicit membership and role scopes. Server-side checks apply to every read and mutation.
- Preserve the prototype's least-privilege defaults: shared goals/location/roster/schedule; private individual rates and agreements visible only to their participant and coordinator; client quote visible to the client and coordinator. Apply these projections to API responses, downloads, signing payloads, activity, notifications, and search. Do not reveal individual fees indirectly through incremental aggregate payout totals.
- Tenant/campaign isolation, constrained guest invitation tokens, revocation, session handling, audit retention, and data export/deletion policies need real design and testing.
- Agreements must bind an authenticated participant, a precise immutable document revision, legal authority, time, and signature evidence. Material amendments must preserve previous signed versions.
- Shared updates need concurrency checks. Do not overwrite one participant's acceptance using stale browser state.
- Payment provider webhooks, idempotency, reconciliation, refunds, disputes, payout eligibility, and country/currency requirements must be authoritative on the server. Never trust browser balances or QR codes as payment instructions.
- Role-specific contracts need actual delivery/acceptance deadlines, cancellation terms, rights clearances, and local legal review. Do not turn the common demo 50/50 split into a universal production rule.
- Public reputation and private safety reports need separate consent, evidence, moderation, and appeal rules. Verified participation does not require platform payment.

The public source repository must never contain client records, IDs, private contract files, API secrets, or talent assets without an appropriate separate license.
