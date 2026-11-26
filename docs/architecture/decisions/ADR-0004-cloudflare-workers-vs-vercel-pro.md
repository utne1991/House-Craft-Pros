# ADR-0004 — Cloudflare Workers (OpenNext) vs Vercel Pro for full-stack Next.js hosting

**Status:** accepted (25/11/2026)
**Date:** 25/11/2026 · **Spec:** `docs/spec-mvp-texas-v2.md` §2.2
**Research date:** 25/11/2026 — documentation research only; **no trial deploy
was performed**, so this ADR records a conditional recommendation, not a proven
outcome.

## Context

Spec v2 §2 originally listed Cloudflare Pages (free, commercial use allowed) as
the $0 alternative to Vercel Pro for production. That option is no longer valid:
Cloudflare archived the Pages Next.js adapter `@cloudflare/next-on-pages` on
29/09/2025, and Cloudflare now directs full-stack Next.js deployments to
Cloudflare Workers via the OpenNext adapter `@opennextjs/cloudflare`. The
decision to be made (by the Owner, before public production — see ADR-0003) is
therefore: **Vercel Pro $20/month/seat** vs **Cloudflare Workers Paid $5/month
via OpenNext**.

## Decision

Cloudflare Workers + OpenNext is adopted as a **candidate** production host,
**conditional on a successful trial deploy** (see Consequences). Vercel Pro
remains the default if the trial fails or if the Owner prefers the native
platform. No final hosting choice is made in this ADR.

## Evidence (researched 25/11/2026)

| Criterion | Cloudflare Workers + OpenNext | Vercel Pro |
|---|---|---|
| Next.js 16 support | Yes — all minor/patch versions of Next.js 16 and the latest minor of 15 are supported (OpenNext docs); Next.js 14 is no longer supported | Yes — native, day-one; Vercel maintains Next.js |
| Runtime | Node.js runtime via `nodejs_compat` (not the narrow Edge Runtime); remove `export const runtime = 'edge'` from routes | Full Node.js, no adapter needed |
| Next.js features | SSR, SSG, ISR, App Router, Route Handlers, Server Actions supported; Node middleware (Next.js 16 `proxy.ts`) experimental since `@opennextjs/cloudflare` 1.20.3 | Full, no documented gaps |
| Worker size limit (hard) | 3 MiB compressed (Free) / **10 MiB compressed (Paid)** | No equivalent bundle cap |
| CPU per request | Free: 10 ms/invocation (too tight for SSR — a server-rendered page typically costs 10–60 ms CPU); Paid: 30 s default, up to 5 min | Metered CPU-hours (Pro includes $20 usage credit) |
| Price | **Paid: $5/month minimum per account** — includes 10M requests + 30M CPU-ms/month; overage $0.30/M requests, $0.02/M CPU-ms; **no egress charge**. Free: 100k requests/day | **Pro: $20/month/seat** — includes $20 usage credit + 1 TB transfer / 1M CDN requests (Flat Rate CDN tier) |
| Commercial use | Allowed (no non-commercial restriction) | Allowed (Pro) |
| Key risks | Bundle over 10 MiB cannot deploy; CPU cost can climb fast with many dynamic requests (one independent analysis illustrates 50M dynamic requests × 40 ms CPU ≈ $40,000 CPU overage — an illustration, not a forecast for this project); adapter is third-party relative to the framework | Higher minimum ($20 vs $5/month) |

**Sources (accessed 25/11/2026):**
- Cloudflare blog, "Deploy your Next.js app to Cloudflare Workers with the
  Cloudflare adapter for OpenNext" (updated 15/07/2026) —
  https://blog.cloudflare.com/deploying-nextjs-apps-to-cloudflare-workers-with-the-opennext-adapter/
- OpenNext docs, Cloudflare adapter —
  https://opennext.js.org//cloudflare
- Cloudflare Workers Pricing (official docs) —
  https://developers.cloudflare.com/workers/platform/pricing/
- Vercel pricing/fair-use figures as verified in the Sprint 00 design review
  (`docs/danh-gia-thiet-ke-2026-11-25.md`, appendix): Pro $20/seat/month with
  $20 usage credit; Hobby non-commercial only.

**What was NOT verified:** no trial deployment of this project's Next.js 16
app on Workers was run; actual bundle size, real CPU cost per request, and
ISR/cache behaviour on Workers are all unmeasured for this codebase.

## Consequences

- **Conditional recommendation:** Workers Paid is technically viable and
  cheaper at the minimum ($5 vs $20/month), with free egress as a real
  advantage for a content-heavy directory. It is the preferred candidate
  **only if** a trial deploy of a minimal Next.js 16 app via
  `@opennextjs/cloudflare` confirms: bundle ≤ 10 MiB compressed, SSR/ISR
  working, and measured CPU cost acceptable at expected traffic.
- **Fallback:** if the trial fails (bundle over the limit, SSR/ISR broken,
  `proxy.ts`/middleware not recognised) or the measured CPU cost is
  unfavourable, the default is **Vercel Pro** — no further evaluation needed.
- **Trial-deploy caveats to check:** keep `middleware.ts` (Next.js 16's
  `proxy.ts` rename was not yet recognised by the adapter as of 08/2026);
  set `compatibility_date` ≥ 2025-05-05 and flags `nodejs_compat` +
  `global_fetch_strictly_public`; watch the 128 MB memory-per-isolate limit.
- **Decision timing:** the Owner makes the final choice before public
  production (ADR-0003). This ADR does not authorise spending or a deploy.

## Status

**Accepted 25/11/2026.** Basis: as ADR-0003 — the Owner approved spec v2 (conditional GO 24/11/2026) and authorised Sprint 01 and Sprint 02. Note: this ADR remains a conditional recommendation from documentation research only (no trial deploy performed); the final host choice is still the Owner's, before public production (ADR-0003). Flipped to accepted in Sprint 02.
