# Champaign handoff

Owner: this chat. Repository `/Users/exeai/Champaign`, branch `main`, https://github.com/henrylove0/Champaign . Parent portfolio `/Users/exeai/naya-website` is unchanged.

## Current deliverable

**https://naya-campaign.vercel.app/** — interactive, shared-password preview. User supplied the password separately; it is not recorded in source or this public handoff. `campaign.livewebsite.com` was a placeholder, clarified to mean a Naya-branded Vercel temporary address. Its existing AWS DNS was inspected but never changed.

Naya's domain is registered on the Champaign Vercel project as a production domain, so visitors see the application password gate without needing a Vercel account. The previous `champaign-six.vercel.app` production address also uses the gate. Non-production Vercel Authentication stays enabled.

## Deployment binding

- Vercel project `champaign`, ID `prj_acSv7MC0aj6f44bYCeUh9EHyYw7T`; team `team_RYdFNFuKwJdwa2mCSvq3WNju` (`exes-projects-58235064`).
- Runtime source: `c60da5c4be52adfaa66b8f460e556d9f14b97789`. Later documentation/screenshot commits do not change deployed runtime files.
- Deployment `dpl_HE7vVTe5Ra6VnZDzVTRoz63HrJs1`, immutable URL `https://champaign-9rqw5m377-exes-projects-58235064.vercel.app`, production, READY.
- Native CLI: isolated `vercel@65.2.0` through npm exec. No global CLI update, Git deployment trigger, timers, new paid service, Supabase project, or payment/signing provider was configured.
- Frontend assets: `index-Igo3vdJu.js` (221449 bytes), `index-okEdq4eU.css` (38406 bytes). Authenticated HTTPS bytes matched the tested local build. No service worker.

## What works

English/Portuguese interface; campaigns and role rosters; editable shared brief; revision-aware approvals; role-specific draft agreements and call sheets; schedules; sample check-in, wrap, handover/client review; guarded payment simulation; free unpaid/external arrangements; local save, scoped export, reset.

Coordinator sees all commercial terms. Client sees its quote and shared work status, without individual rates/contracts or incremental payout totals. Collaborators see their own commercial terms. This covers screens, generated documents, activity, and exports. Job titles do not grant coordinator privileges. Participant authorization remains a demonstration because every sample record is stored in this browser and demo personas are switchable.

The Node routing middleware protects HTML and assets with a salted scrypt password hash and host-bound, signed, seven-day HttpOnly/Secure cookies. Missing configuration fails closed. Same-origin POST checks protect login/logout. Responses are private/no-store. **Lock preview** clears the cookie without erasing local campaign data.

Server-only sensitive `PREVIEW_PASSWORD_HASH` and `PREVIEW_SESSION_SECRET` are configured for production/preview. Values were not logged, committed, or written to credential files. The stdin-only setup helper is `scripts/configure-preview-env.mjs`; it does not overwrite existing variables silently.

## Verification

- Type-check, 32 tests (21 campaign/visibility + 11 gate), production build, helper syntax, and whitespace checks passed. Dependency audit: zero vulnerabilities. Lockfile has 56 package entries with 55 official npm tarball URLs.
- Live API checks: anonymous login page, blocked anonymous JavaScript, wrong password rejection, correct password/secure cookie, uncached authenticated HTML, exact JS/CSS bytes, host-bound sessions, and logout.
- Real IAB browser: native password login succeeds; People, Plan, Agreements, Payments, and Activity navigation succeeds; created an unpaid campaign and observed R$0; reset the owned fixture; Lock preview returns to the password page; re-login succeeds. Original sample restored and workspace left open.
- Mobile gate 390px: client/scroll width both 390. Jev gate assertion PASS / 0 actions / https://naya-campaign.vercel.app/ / 1107 ms. Browser outcome independently confirmed.
- Published screenshots: `docs/private-preview.jpg` (gate), `docs/preview.jpg` (workspace). `artifacts/` contains ignored local QA shots.

## Operational lessons and next phase

Vercel emits the server module as JavaScript; middleware must import `./server/preview-gate.js`. The TypeScript extension caused a module-not-found error despite a successful build. A compiled Node import qualified the repair. `Referrer-Policy: no-referrer` made native form origins null; `same-origin` fixed browser login/logout while retaining strict origin validation. A manual alias alone triggered Vercel SSO; registering the production domain resolved that without disabling project protection.

Next production phase: shared Odd identity with Champaign's own data project, server-side campaign isolation, immutable reviewed agreements/signatures, and suitable payment-provider integration. No real identities, funds, escrow, signatures, or background agents exist in this demo. See `docs/INTEGRATION.md`. No owned local server is running.
