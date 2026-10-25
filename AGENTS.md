# Champaign

Independent, open-source campaign coordination prototype for Naya Lima. The parent website at `/Users/exeai/naya-website` is a separate repository; do not modify or deploy it implicitly.

- Own this repository only. Preserve user changes.
- `npm run check`, `npm test`, and `npm run build` are required before publishing changes.
- Keep English and Brazilian Portuguese functional, and check desktop and mobile layouts.
- This version is browser-local demo software. Persona switching is not authentication. Role checks are workflow simulation, not security boundaries.
- Do not present demo approvals as signatures, simulated balances as money, or template drafts as reviewed legal advice. Do not add real credentials, client records, or Naya's contract.
- Material scope changes must invalidate earlier approvals. Never release simulated funds without the current agreement and milestone evidence.
- Future multi-user work requires server-side authentication, authorization, tenant isolation, immutable agreement versions, concurrency protection, and a regulated payment provider. A payment redirect or QR code alone is not escrow or evidence of completed work.
- No paid infrastructure, production DNS changes, signing services, or payment integrations are authorized by the prototype brief.
- User instruction (2026-10-26): deploy the interactive preview to Vercel with a shared password gate. Clarified that the desired address is a Naya-branded temporary Vercel address; `livewebsite.com` was a placeholder. Do not change that domain's DNS. This does not authorize paid services or real payment/signing integrations.
- Preview access must be checked on the server before HTML and assets are served, using server-only environment configuration and signed HttpOnly cookies. Fail closed if configuration is missing. The preview password is not a substitute for per-user authorization.
- Keep `docs/HANDOFF.md` current. Source is MIT licensed; private talent assets and third-party photographs are excluded unless separately licensed.
