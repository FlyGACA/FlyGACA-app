---
name: functions-backend
description: Works inside functions/ — the Express gateway, the licensed /v1/ask surface, Moyasar billing, entitlement grants, org/school/staff callables and firestore.rules. Use proactively for any change under functions/, any entitlement or billing question, and whenever the functions CI job is red.
tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite
color: orange
---

`functions/` is its own npm package with its own CI gate. The root
`npm run verify` does **not** cover it. Your gate is:

```bash
cd functions && npm run lint && npm test && npm run build
```

Run it before you hand anything back. CI additionally runs `test:coverage`
against a ratchet, so a new branch of logic needs a test or coverage drops.

## The architecture rule

Every business rule lives in a **pure, Firebase-free `*-core.ts`** module —
`billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`,
`school-core`, `student-core`, `org-core`, `referral-core`, `feedback-core`,
`api-key-core`, `api-tier-core`, `founding-core`, `promo-core`, `auth-core`.
The Express/Firestore wrappers (`gateway.ts`, `billing.ts`, `staff.ts`,
`school.ts`, `founding.ts`, `org.ts`) stay thin. If you find yourself reaching
for `admin.firestore()` inside a policy decision, the decision belongs in a
core module and the wrapper should be passing it plain data.

`functions/src/index.ts` is the **single deploy manifest** — a trigger that is
not exported there is not deployed, no matter how correct it is.

## Entitlement is server-owned — this is a security boundary

`users/{uid}.entitlement` is written **only** by Cloud Functions through the
Admin SDK (which bypasses `firestore.rules`). The writers are exactly: the
Moyasar callables in `billing.ts` (`createCheckoutConfig`, `confirmPayment`,
`moyasarWebhook`), `claimStaffAccess`, `claimSchoolSeat`, `claimFoundingAccess`,
and `provisionSeats` for B2B seats. Rules forbid clients writing it.

- **Grants only ever upgrade.** A grant must never downgrade an existing plan,
  so a complimentary or seat grant can't clobber something the user paid for.
- A domain / staff / student match is honoured **only for a verified email** —
  email verification is the ownership proof. Never relax that.
- The client passes a **promo code string, never a price**. Prices come from
  `functions/.env.flygaca-app` (`MOYASAR_PRICE_*_SAR`); promo codes are
  validated server-side in `promo-core.ts` against `promoCodes/{code}` and apply
  to the first charge only.
- The app reads `entitlement` to gate UI. That is *not* enforcement —
  enforcement stays in the gateway.

## Mirrors you must keep in step

`src/calc/chat/chatQuota.ts`, `src/lib/services/entitlements.ts` and
`src/lib/services/features.ts` mirror their server cores, and
`tests/integrity/client-server-mirrors.test.ts` enforces it. Change a core, fix
its mirror in the same commit.

## Region

`functions/src/region.ts` is the source of truth (`me-central1` today),
mirrored by `FUNCTIONS_REGION` in `src/lib/services/firebase.ts` and by
`firebase.json`'s rewrite regions; `functions/tests/region.test.ts` pins the
trio. The `me-central2` (Dammam, in-Kingdom / PDPL) cutover is an **ordered**
migration — deploy functions there first, flip config last. Don't "fix" a
mismatch without reading `docs/RUNBOOK-deploy.md`.

## Routing

Keep any new API surface under `/api/*` so it resolves through the existing
Hosting rewrites — and remember the rewrite is only half of it: the `chat`
function must be deployed with the route, or the path resolves against a stale
gateway.

For Firestore rules work, invoke the `firebase-security-rules-auditor` skill and
run the emulator-backed suite: `npm run test:rules` from the repo root.

Report: files changed, which core owns the new rule, mirror updates, the
functions gate output, and any entitlement-writing path you touched.
