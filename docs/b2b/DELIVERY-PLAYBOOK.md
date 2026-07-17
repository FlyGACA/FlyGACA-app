# Cohort Delivery Playbook

How to onboard, run, and report on a B2B AIP-prep cohort. Includes the **manual path** for
cohort #1 — using the existing `grant-school-seats.mjs` provisioning + self-serve `claimSchoolSeat`,
before the admin dashboard (`PLAN.md` §8) ships — so we can
sell and deliver immediately.

> Fly GACA is not affiliated with GACA. Everything below is preparation; candidates verify
> against the official eAIP / GACAR.

## Roles

- **Fly GACA success owner** — provisions the cohort, runs onboarding, delivers the report.
- **Org admin** — the customer's point person; owns the roster and the pass threshold.
- **Candidate** — the seat holder working the curriculum.

## Phase A — Setup (day 0–3)

1. Confirm the signed proposal: tier, seat count, access window, pass threshold, branding.
2. Collect the roster (name + email) from the org admin as CSV.
3. Provision seats:
   - **With admin dashboard (target state):** admin uploads the CSV under `/business/admin`;
     invites fire automatically; each seat gets the `org` entitlement on accept.
   - **Manual (cohort #1) — the day-one path, works today:** save the roster as `roster.csv`
     (one email per line) and, from `functions/` with Admin credentials, run
     `node scripts/grant-school-seats.mjs --file=roster.csv` (add `--expires=YYYY-MM-DD` for a
     contract end; `--dry-run` to preview; `--revoke` to offboard). It grants the invoiced
     `school` entitlement — which unlocks every Pro feature — to each existing account, and writes
     an invite for every roster email that has no account yet so those members **self-unlock on
     their first sign-in** (via `claimSchoolSeat`) with no re-run needed. Idempotent. Send a
     branded invite email with the study-loop instructions and track the roster in a shared sheet
     until the admin dashboard exists.
4. Send the org admin the **kickoff pack**: the `SALES-ONE-PAGER` study loop, the study-sheet
   PDFs (EN + AR), and a one-paragraph "how your candidates start" note.

## Phase B — Kickoff (week 1)

- (Academy+) Run the onboarding session: walk the admin through the dashboard and the readiness
  definition; walk candidates (or a train-the-trainer) through the study loop.
- Candidates begin **Module 0–1**. Confirm every seat has logged in and can switch language.
- Set expectations: ~6 hours of content over 2–3 weeks, Mock Exam gates "ready".

## Phase C — Run (weeks 1–3)

- Candidates work the loop per `CURRICULUM.md`: study sheet → eAIP reading → question bank →
  Mock Exam → review misses against citations → repeat.
- **Weekly seat check** — from `functions/`, run
  `node scripts/school-cohort-report.mjs --file=roster.csv` (add `--csv=cohort-status.csv` to
  export) to see who has an active seat, a pending invite, or an expired/absent one. Reconcile
  against the shared tracker; nudge inactive/unclaimed seats at day 5 and day 12 (email).
- Captain Adel is available the whole time for "where in the AIP…" questions.

> **Study progress is not yet server-visible.** Coverage % and Mock Exam scores live in each
> candidate's browser (local-first, `src/lib/studyProgress.ts`), so the report covers the **seat**
> dimension only. Until server-side progress sync exists (PLAN.md §8), collect study readiness the
> low-tech way — a short self-report/screenshot from the admin, or the candidate's in-app Study
> dashboard — and record it in the tracker by hand.

## Phase D — Readiness & report (end of window)

1. **Seat status:** `school-cohort-report.mjs --csv=…` → who holds an active seat vs. pending/expired.
2. **Study readiness (manual for now):** per candidate, **full bank coverage + Mock Exam ≥ threshold**
   at least once, gathered from their in-app Study dashboard (self-reported) until progress sync lands.
   The in-app scores are authoritative; the tracker just records them.
3. Deliver to the org admin with a short summary: N seats active, N candidates ready, standouts,
   and who needs another pass.
4. Log the outcome and ask for the case-study quote (design partners) or renewal/expansion.

## Phase E — Expand

- Propose the next intake or a higher tier if the cohort filled its seats.
- For design partners: turn the report + a testimonial into a published case study on
  flygaca.com and feed the SEO/`/for-schools` funnel.

## Manual-mode checklist (cohort #1, no dashboard yet)

- [ ] Roster CSV received and stored in the shared tracker with a cohort id.
- [ ] Roster provisioned with `grant-school-seats.mjs`; access verified by a test login.
- [ ] Branded invite + study loop emailed to every candidate.
- [ ] Weekly seat status via `school-cohort-report.mjs --csv=…`; reconciled with the tracker.
- [ ] Study coverage + Mock Exam scores pulled manually (in-app Study dashboard) into the tracker.
- [ ] Readiness computed by hand from the tracker; report built and delivered.
- [ ] Retro captured → feeds the requirements for progress sync + the admin dashboard (`PLAN.md` §8).

## Definitions

- **Coverage** — the seat has attempted every question bank in the pack (`aip-ais`, `airspace`).
- **Ready** — coverage complete **and** Mock Exam ≥ the org's threshold (default 75%) at least once.
- **Active** — logged in and answered ≥1 question in the last 7 days.
