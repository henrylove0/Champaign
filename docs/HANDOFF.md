# Champaign prototype handoff

Owner: this chat. Source: `/Users/exeai/Champaign`, branch `main`. Parent portfolio: `/Users/exeai/naya-website`, unchanged.

## Deliverable and stopping condition

An independent, open-source interactive prototype for Naya's creative campaign coordination. Complete when the core lifecycle works, checks/build pass, desktop/mobile behavior is inspected, and a separate repository and usable preview are available. No real payment/signature provider or production portfolio/DNS changes.

## Implemented

English/Portuguese UI; campaign creation/switching; model/actor/photo/video/beauty/styling/production roles; editable brief; versioned approvals; role-specific draft agreements and call sheets; schedule changes; sample attendance; wrap; handover/client review; guarded payment simulation; free unpaid/external workflows; local save/export/reset. Original coastal SVG avoids talent-photo licensing concerns.

`src/model.ts` owns workflow rules; `src/documents.ts` owns draft generation; `src/permissions.ts` owns visibility/export policy; `src/App.tsx` owns interface; `tests/workflow.test.ts` owns lifecycle and privacy checks.

User steering: rates and some campaign information must have role-based visibility. Coordinator (Naya) sees all; client sees the quote and shared work status without others' rates/contracts or incremental payout totals; collaborators see own commercial terms. Policy covers UI, draft generation, activity, and JSON exports. The visible rules dialog explains this. All sample records remain local and demo views are switchable, so these are not real authentication/security boundaries.

## Verification

- `npm run check`, 21 tests, and `npm run build`: passed.
- `npm audit`: zero vulnerabilities after updating Vite from 8.3.1 to 8.3.5. Node types 22.19.0 and TypeScript 5.9.3 resolve dependency/type syntax compatibility.
- Real IAB flow: Bia approval → client funding → each crew check-in → coordinator wrap → all handovers → client acceptance → six payouts. Simulated service payouts R$10,000; remaining R$0. Private role views checked on People and Payments.
- Mobile 390px: document width/scroll width both 390; no horizontal page overflow. Hidden navigation removed from the accessibility tree until opened.
- Jev desktop overview: PASS, 0 actions, 1299 ms; mobile 390px PT toggle: PASS, 1 action, 1530 ms. Both final URLs `http://127.0.0.1:4327/`; visible UI independently confirmed in IAB.
- Public MIT repository: https://github.com/henrylove0/Champaign . Application source pushed as `a81815268ae89250ad86bf3549cf2e59e9ecac25`; later documentation/screenshot commits do not change the deployed application.
- Clean `npm ci` using the public registry succeeded; all 53 lockfile tarball URLs point to `registry.npmjs.org`. Explicit Node 22.20.0 type-check, all 21 tests, and build passed as well as the default Node 24 run. No paid jobs or schedules were configured.
- Hosted prototype: **https://champaign-six.vercel.app/**, Vercel project `champaign`, ID `prj_acSv7MC0aj6f44bYCeUh9EHyYw7T`, team `team_RYdFNFuKwJdwa2mCSvq3WNju`. Deployment `dpl_B4uMiNJs2VX6br86XwAy49jFi7T8`, immutable URL `https://champaign-lp6jd334c-exes-projects-58235064.vercel.app`, READY. No Git deployment trigger was connected.
- Anonymous HTTPS returned 200; hosted JS `index-DVDgISd7.js` (221193 bytes) and CSS `index-PLlSGWjL.css` (38037 bytes) are byte-for-byte identical to the tested local build. No service worker is used. Noindex is present.
- Published UI confirmed in IAB in English/Portuguese. The Portuguese visibility matrix opens correctly. Mobile 390px and desktop 1280px document widths equal their scroll widths. Screenshot `docs/preview.jpg` shows the published desktop interface; local QA shots in ignored `artifacts/`.
- Installed Vercel CLI 44.7.3 was rejected by hosting. Suggested minimum 47.2.2 was unavailable in the configured registry. Queried official npm releases and used isolated `vercel@65.2.0` successfully; global tools were unchanged.

## Production limits

Browser-only state; no real accounts, invitations, shared records, authenticated signatures, verified attendance, payment processing, escrow, or background automation. Sample brand and collaborators are fictional. All participant terms must be completed/reviewed before real use. Funding or attendance locks scope changes until an amendment/refund flow exists.

## Next

Prototype complete. Next production phase: authenticated multi-user backend and server-enforced visibility before real client data, plus reviewed signing/payment integrations. Integration guidance in `docs/INTEGRATION.md`; proposed `book.nayaralima.com` is not configured. Local preview uses port 4327 when started; the hosted app is the deliverable.

## Private preview update (2026-10-26)

User requested a shared-password Vercel preview and clarified the desired address is a Naya-branded temporary Vercel name. `livewebsite.com` was a placeholder; its DNS was inspected but not changed. `naya-campaign.vercel.app` is the candidate alias (unassigned at inspection).

Added root Node routing middleware and `server/preview-gate.ts`. It checks all HTML/assets, uses a salted scrypt hash, host-bound signed seven-day HttpOnly/Secure cookies, same-origin POST forms, private/no-store responses, and a bilingual server-rendered login. Missing configuration fails closed. **Lock preview** clears the session while preserving browser-local campaign data. This remains shared preview entry, not authenticated participant authorization.

Sensitive `PREVIEW_PASSWORD_HASH` and `PREVIEW_SESSION_SECRET` are configured on the exact Champaign project for production and preview. No values were printed, put in client code, or written to credential files. Reusable stdin-only helper: `scripts/configure-preview-env.mjs`. Do not rerun against existing variables to rotate implicitly.

Checks: type-check, 32 tests (21 campaign/visibility + 11 gate), build, helper syntax, whitespace checks passed. @vercel/functions is pinned to 3.6.1 and imported through its middleware subpath; 3.10.3 introduced a vulnerable unused OIDC dependency chain and was removed. Audit after the replacement reports zero vulnerabilities. Server environment names and crypto code are absent from client assets. Deployment and browser checks pending.
