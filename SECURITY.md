# Security Policy

## Supported versions

Fly GACA is a continuously deployed web app plus its native shells — there are no
released versions supported in parallel. Only what is currently deployed from `main`
(flygaca.com and the App Store builds) receives fixes.

## Reporting a vulnerability

Email **[i@flygaca.com](mailto:i@flygaca.com)** with enough detail to reproduce: the
affected URL or endpoint, the steps, and what you were able to access or change. Please
report privately rather than opening a public issue, and give us a chance to ship a fix
before disclosing.

Expect an acknowledgement within a few days. We will tell you whether the report is
accepted, and let you know when a fix is deployed.

Please do not run automated scanners against the production site, access or modify data
belonging to other users, or degrade the service for anyone else while testing.

### Especially interested in

- Anything that lets a client write `users/{uid}.entitlement`, or otherwise grant itself a
  paid plan, a seat, or an exam-prep pack. That record is server-owned (Cloud Functions via
  the Admin SDK); `firestore.rules` must never permit a client write.
- Bypasses of the `/api/*` gateway's auth, App Check, rate limiting, or free daily quota.
- Anything that reads another account's logbook, records, or study progress.
- Stripe webhook handling, and the `claimStaffAccess` / `claimSchoolSeat` / `provisionSeats`
  grant paths.

### Out of scope

Reports that the regulatory content is out of date or disagrees with GACA are not security
issues — Fly GACA is an independent educational library, not affiliated with GACA, and every
page says to verify against the official source. Send those to the same address as ordinary
feedback.
