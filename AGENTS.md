# AGENTS.md — House Craft Pros (Texas MVP)

Operating manual for everyone (human or AI agent) working in this repo.
Spec hiện hành: `docs/spec-mvp-texas-v2.md` (Sprint 00). Spec v1
(`docs/spec-mvp-texas.md`) is SUPERSEDED — kept for history only, never build from it.

## 1. Project

House Craft Pros is a US trades directory, starting with Texas (electrical, HVAC,
plumbing). Its wedge is a **License Verification tool** that lets a homeowner look up
a contractor's real license from Texas government data (TDLR + TSBPE public CSVs).
Long-term direction: Homeowner Intelligence Platform (License Intelligence, Local
Directory, Cost Intelligence, Homeowner Academy). See `docs/spec-mvp-texas-v2.md` §8.

- **Owner:** decides GO/NO-GO, domain name, spec/PR acceptance, commercial hosting
  budget, and anything about partners, charging, or satellite sites.
- **anh Út:** approval gate for code and deploy — no code merges to `main` and no
  production deploy without his approval.
- **Manager agent + worker agents:** plan, execute, verify with evidence
  (Intent to Evidence: verify result → PR → Owner accepts → deploy).

## 2. Stack (chốt, Sprint 00 / spec v2)

| Layer | Choice |
|---|---|
| Frontend / SEO | Next.js 16 (App Router) + TypeScript, React 19 |
| Database | PostgreSQL via Supabase (11 tables — see spec v2 §4) |
| Data Ingestion Engine | Separate TypeScript ETL in `etl/` (zero deps, Node 24); **no Next.js imports** |
| Repo / CI | GitHub `github.com/utne1991/House-Craft-Pros` |
| Hosting (experiment) | Vercel Hobby — non-commercial validation only |
| Hosting (commercial) | **Decided by Owner BEFORE public production** — Vercel Pro $20/month/seat OR Cloudflare Workers Paid $5/month via `@opennextjs/cloudflare` (see spec v2 §2.2) |
| DNS / CDN | Cloudflare; domain managed at GoDaddy |
| Analytics | GA4 + Google Search Console |

**NOT used:** Astro + VPS/Coolify; Google AI Studio as production (prototype only);
Cloudflare Pages for full-stack Next.js (its Next.js adapter
`@cloudflare/next-on-pages` was archived 29/09/2025 — superseded by Workers +
OpenNext; see spec v2 §2.2).

**Porting note:** FarmDirect is Next.js 14 / React 18. Reuse its *logic and patterns*,
never copy its framework version. Next.js 16 needs React 19 — check breaking changes
when porting.

## 3. Hard rules (never break)

1. **No fabricated data.** Every number traces to a source file + checksum
   (`ingestion_runs`). Never invent a license, phone number, price, or review.
2. **No PII / secrets / CSV in the public repo.** The repo is public. Raw government
   CSVs (they contain contractors' personal phones) stay local/out of the repo;
   no API keys, credentials, or `.env` values committed. Secrets only via
   environment variables.
3. **Never label anything "Verified" without authority confirmation.**
   `license_status` (the license's own status: active / expired / suspended /
   revoked / unknown) and `verification_level` (OUR confidence: authority-confirmed /
   inferred / unverified) are separate fields — see spec v2 §4–§5. TDLR CSVs have
   **no status field**; status inferred from the expiration date is `inferred`,
   never `authority-confirmed`. Display wording: "License status as reported in
   [source] on [date]" + a link to the .gov lookup page.
4. **Two publication gates, kept separate.** `data_publication` = the record is
   visible in the Verify tool / directory data. `seo_index_publication` = the URL
   is in the sitemap index and indexable. A record can be data-published without
   being SEO-published. Never put a URL in the sitemap index until it passes the
   SEO gate (spec v2 §6.4).
5. **$0 is the experiment/validation budget only.** No spending without Owner
   approval. The commercial hosting budget (Vercel Pro and/or Cloudflare Workers
   Paid, Supabase Pro) must be decided **before public production**, not deferred
   to monetization.
6. **No SMS marketing** (TCPA + Texas SB 140). Claim verification is by manual
   phone call, never bulk SMS.
7. **No paid ranking.** Paid placement, if it ever exists, must be labelled
   advertising clearly per FTC rules and must never change verification results.
8. **No AggregateRating / Review schema** without real reviews. No AI-generated
   photos presented as a contractor's photo.
9. **Site-facing wording is US English.** Docs in this repo are in Vietnamese —
   keep that; user-facing site copy is English only.

## 4. Approval gates

| Action | Gate |
|---|---|
| Spec / PR acceptance | Owner |
| Code merge to `main` | Owner acceptance + anh Út approval |
| Deploy to production | anh Út approval (every time) |
| First live ETL load | Owner / anh Út approve the dry-run numbers |
| Any spending | Owner approval first ($0 rule) |
| Legal questions (Sponsored label, SB 140, republishing personal phones) | Lawyer review before launch |

**Never merge to `main` without Owner acceptance.** No Sprint 02 before Sprint 01
acceptance; no production deploy in Sprint 01 at all.

## 5. How to run ETL and tests

The ETL lives in `etl/` — a separate package, zero dependencies, plain `node`
(erasable-syntax TypeScript only: no enums, namespaces, or parameter properties).

```bash
node --version          # must be 24.x (checked: v24.22.1 on the VM, 25/11/2026)
cd etl
node --test tests/      # run the test suite (node:test)
```

- ETL stages: download → parse → normalize → dedupe → load → verify. See
  `docs/architecture/etl-pipeline.md` and `etl/README.md` (Sprint 01).
- Migrations: `db/migrations/` (numbered, idempotent, PostgreSQL dialect).
  PostgreSQL is the canonical database; any stand-in used for a dry-run must be
  labelled as a stand-in, never as the contract.
- Raw CSVs stay OUT of the repo (local staging only, e.g.
  `~/workspace/trades-directory/research/raw/` or `/tmp`). Record URL, file date,
  row count, and SHA-256 for every download in `ingestion_runs`.
- Verify after every change by re-reading the edited files and re-running the
  tests — do not trust a "done" report without evidence.

## 6. Branch / PR workflow

1. Work on a feature branch (e.g. `sprint-01/data-foundation`), never directly
   on `main`.
2. Small, reviewable PRs; one concern per PR. PR body: summary, what changed,
   how to verify, acceptance checklist, known gaps.
3. Every claim in a PR/report cites execution evidence (command output, file,
   test run). If a requirement cannot be met, say so explicitly with the reason
   and the residual risk — never paper over it.
4. QA is independent from execution; default verdict is NEEDS WORK unless the
   evidence is overwhelming.
5. Workers never touch GitHub (no push / PR / merge / deploy) unless the task
   explicitly says so. The coordinator/parent agent does the push and PR creation.

## 7. PUSH CONVENTION — report CHANGED files, not manifest paths

When reporting a push, list the files GitHub actually records as changed
(`git diff --stat` / the PR's "Files changed" tab), **not** the list of files a
task manifest or sync script intended to copy.

**Correction, recorded 25/11/2026 (Sprint 00):** commit `fb434496` was reported
as "16 files" but GitHub recorded only **5 changed files** — `README.md`,
`docs/danh-gia-thiet-ke-2026-11-25.md`, `docs/dinh-huong-2026-11-24.md`,
`docs/spec-mvp-texas-v2.md`, `docs/spec-mvp-texas.md` — because the other 11
manifest paths were byte-identical to HEAD. The "16 file" claim was wrong; the
"5 file" observation was correct. Always verify the changed-file count against
GitHub (or `git diff`) before reporting it.

## 8. Key docs

| Doc | What it is |
|---|---|
| `docs/spec-mvp-texas-v2.md` | Current spec (Sprint 00) — authority for all build decisions |
| `docs/spec-mvp-texas.md` | Spec v1, SUPERSEDED — history only |
| `docs/danh-gia-thiet-ke-2026-11-25.md` | Design review 7.3/10 + verified P0 claims |
| `docs/dinh-huong-2026-11-24.md` | Direction report (GO with conditions, 90-day plan) |
| `docs/cau-truc-site.md` | Site structure: URLs, page types, data model, SEO rules |
| `docs/cay-bai-viet-lien-ket.md` | Article tree + internal-link graph |
| `docs/specs/sprint-01/` | Sprint 01 spec / plan / tasks (Data Foundation) |
| `docs/architecture/` | Data model, data dictionary, ETL pipeline, Rust readiness (Sprint 01) |
| `research/` | Research batch 1 + Texas data findings (numbers only, no raw CSVs) |
