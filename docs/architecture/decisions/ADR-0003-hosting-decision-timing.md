# ADR-0003 — Commercial hosting budget must be decided BEFORE public production

**Status:** proposed (becomes "accepted" only when the Owner accepts the PR that
contains it)
**Date:** 25/11/2026 · **Spec:** `docs/spec-mvp-texas-v2.md` §1, §2, §3, §11

## Context

Spec v1 treated "$0" as the operating budget and deferred the commercial hosting
decision to monetization ("quyết trước khi monetize"). The Sprint 00 design review
(25/11/2026, `docs/danh-gia-thiet-ke-2026-11-25.md`) showed that position is
unsafe:

- **Vercel Hobby is non-commercial only.** Vercel's Fair Use Guidelines restrict
  Hobby teams to non-commercial personal use; all commercial usage requires Pro
  or Enterprise. Commercial includes taking payments, running ads (AdSense),
  affiliate as the main purpose, and being paid to build/host the site. House
  Craft Pros is built as a commercial venture, so Hobby cannot be its production
  host.
- **Hobby also caps usage** (100 GB transfer, 1M invocations/month) and, once a
  cap is hit, the feature typically stays off for ~30 days — a production outage
  with no paid way out.
- **Supabase Free has the same shape of risk:** 500 MB database, pause after 7
  days of low activity (manual resume), no automatic backups.
- A site that is public, indexed by Google, and collecting users is already a
  commercial operation in substance — even before the first dollar of revenue.
  Deciding the budget only "when we monetize" means running a public commercial
  site on plans that forbid commercial use, with no backup and no support.

## Decision

The commercial hosting/operations budget — which paid plan(s), who pays, and the
spending cap — must be decided by the Owner **BEFORE public production**
(i.e. before the site is launched to the public and indexed), **not** deferred
to monetization. The options on the table are Vercel Pro $20/month/seat
(includes $20 usage credit) or Cloudflare Workers Paid $5/month via the OpenNext
adapter (see ADR-0004), plus Supabase Pro $25/month if the Free tier's limits
(500 MB, 7-day pause, no backups) are a risk to production data.

Concretely: no public launch (Sprint 03/04) goes ahead until the Owner has
chosen and funded the commercial hosting option. Experiment/validation work
(Sprints 00–02, non-public) may continue on the $0 tiers.

## Consequences

- **Positive:** no ToS violation by running a commercial site on a
  non-commercial plan; no surprise 30-day feature pause on a live site;
  backups and support exist from day one of public operation; the cost is
  known and budgeted ($5–$20/month hosting + $25/month database at the low
  end) instead of discovered during an incident.
- **Negative / cost:** the project starts paying a small monthly amount
  ($5–$45/month depending on the choice) before it earns anything. That cost
  is the price of a lawful, reliable public launch and must be accepted as
  part of the GO decision, not treated as optional.
- **If the Owner declines to fund it:** public production is blocked. The
  project stays in non-public validation (or stops) — it does not launch on
  Hobby/Free and hope nobody notices.

## Status

**proposed** — awaiting Owner acceptance of the Sprint 00 PR.
