# Sprint 02 — held-cluster review queue

**Date:** 25/11/2026 · **Database:** rebuilt local Postgres `housecraftpros`
(fresh TDLR/TSBPE files 25/11/2026) · **Status:** measured, **no decisions
made**. This file is the queue a human reviewer works through with
`etl/src/review-cli.ts`. Nothing here was merged or rejected by this sprint.

## 1. The queue

| | Count |
|---|---|
| Distinct clusters awaiting review (latest decision `held_ambiguous`) | **965** |
| Licenses in those clusters (live) | **2,348** |
| Decision rows `held_ambiguous` (all runs) | 994 |
| Distinct clusters ever held, later merged by a subsequent load | 14 |
| Distinct clusters latest = `rejected_no_merge` (ETL decided, on conflicting evidence — not in the queue) | 355 |

Why 994 rows → 965 clusters: the 994 held rows reconcile exactly —
975 rows belong to the 965 queue clusters (10 of them hold two held rows
from two runs), 14 rows belong to clusters later merged by a subsequent
load's evidence-based merge, and 5 rows belong to clusters later rejected
on conflicting evidence (975 + 14 + 5 = 994). The queue counts **distinct
clusters whose latest decision is still held** (most recent `decided_at`,
ties broken by `id DESC` — the same rule `review-cli.ts` uses).

## 2. Size distribution (live licenses per cluster)

| Licenses in cluster | Clusters |
|---|---|
| 2 | 715 |
| 3 | 166 |
| 4 | 44 |
| 5 | 25 |
| 6 | 6 |
| 7 | 4 |
| 8 | 1 |
| 11 | 2 |
| 12 | 1 |
| 13 | 1 |
| **Total** | **965** |

74% of the queue is a 2-license cluster — the cheapest reviews. Start
there; the 11–13-license clusters (4 of them) are the ones where a wrong
merge does the most damage, so they deserve the most care.

## 3. What "held" means

The ETL groups licenses by normalized business name. A cluster is held
when the licenses share **only the name** — no shared phone or address
evidence — so the ETL refuses to merge them (conservative dedupe, US3).
Each license keeps its own `ambiguous_held` business. A held cluster is
NOT one business; it is a question: "are these the same business?"

## 4. How to review (the workflow)

```bash
cd etl
node src/review-cli.ts --list --limit 50        # next 50 clusters, oldest first
node src/review-cli.ts --show "<cluster_key>"   # licenses + businesses + evidence
# Decide — plan first, then execute:
node src/review-cli.ts --decide "<cluster_key>" --decision merge --by <your-name> --note "why"
node src/review-cli.ts --decide "<cluster_key>" --decision merge --by <your-name> --note "why" --confirm
node src/review-cli.ts --decide "<cluster_key>" --decision keep-separate --by <your-name> --note "why" --confirm
```

- `--by` names the human reviewer; `--confirm` executes (without it, the
  command only prints the plan). Both are required to change anything.
- **merge** moves every license of the cluster into one business and
  deletes the emptied business rows (each with an `audit_logs` row, so the
  removal stays traceable). Use it only when the evidence shows one
  business (same storefront/phone/address, verified by a call or by the
  source data — never on name alone).
- **keep-separate** records that the cluster was reviewed and is NOT one
  business. Use it when the evidence shows different businesses (different
  phones, different addresses, different owners).
- If the evidence is inconclusive, decide nothing — leave the cluster in
  the queue and note what would settle it (e.g. a phone call).
- A decided cluster cannot be decided again through the tool; re-opening
  one needs a direct database decision, recorded in `dedupe_decisions`
  with `decided_by = 'human:<identifier>'`.

## 5. What NOT to do

- Do not bulk-decide clusters without looking at each one. The queue is
  965 clusters; speed is not the goal, correctness is — a wrong merge
  publishes one business's phone/address on another business's licenses.
- Do not merge on name alone. That is exactly what the ETL refused to do.
- Do not edit `dedupe_decisions` by hand; use the CLI so every decision
  carries who, when, and why.
