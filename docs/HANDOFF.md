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
- Separate public repository created: https://github.com/henrylove0/Champaign . Source push and hosted preview pending.

## Production limits

Browser-only state; no real accounts, invitations, shared records, authenticated signatures, verified attendance, payment processing, escrow, or background automation. Sample brand and collaborators are fictional. All participant terms must be completed/reviewed before real use. Funding or attendance locks scope changes until an amendment/refund flow exists.

## Next

Finish source publication and hosted preview; record verified URL and revision. Integration guidance in `docs/INTEGRATION.md`; proposed `book.nayaralima.com` is not configured. Local preview uses port 4327.
