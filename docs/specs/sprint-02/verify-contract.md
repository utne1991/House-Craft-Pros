# `/verify/` contract — License Verification Tool (Sprint 02 handoff for Sprint 03)

**Date:** 25/11/2026 · **Status:** contract for the future Next.js route
(`spec v2 §6.1`). The data layer exists and is tested (`etl/src/lookup.ts`,
`etl/src/lookup-cli.ts`); there is **no HTTP server in this sprint** — the
route is built in Sprint 03 from this contract. Local only, no deploy.

## 1. What the tool answers

A homeowner enters a **business name or a license number + trade**
(electrical / HVAC / plumbing). The tool answers, from the local Postgres
(TDLR + TSBPE CSVs, last load 25/11/2026):

- Is the license real (in our data)? What is its number, type, trade?
- What is its status — `active` / `expired` / `suspended` / `revoked` /
  `unknown` — and **how confident are we** — `authority-confirmed` /
  `inferred` / `unverified`?
- When does/did it expire? Who holds it? Which business, address/county,
  phone (if the source has one)?
- Where to re-check on `.gov`?

## 2. Request

```
GET /verify/?q=<name-or-number>&trade=<electrical|hvac|plumbing>
```

- `q` is required. A pure number is treated as a license number (exact
  match within the trade); anything else is a business-name search
  (normalized-name substring match).
- `trade` is required for a license-number lookup, optional for a name
  lookup (searches all 3 trades when omitted).
- Shareable URL: the result page IS the URL above (spec v2 §5).

## 3. Response (JSON shape — what `etl/src/lookup.ts` already returns)

```json
{
  "found": true,
  "ambiguous": false,
  "total_matches": 1,
  "guidance": null,
  "matches": [
    {
      "license_number": "1001",
      "license_type": "Responsible Master Plumber",
      "license_subtype": null,
      "trade": "plumbing",
      "license_status": "active",
      "verification_level": "authority-confirmed",
      "license_status_source": "source_field",
      "expiration_date": "2027-06-30",
      "issue_date": "2020-01-15",
      "status_as_of": "2026-11-25",
      "endorsements": ["MEDGAS"],
      "holder": "SMITH JOHN",
      "business": {
        "id": "<uuid>",
        "name": "SMITH PLUMBING LLC",
        "phone": "5125550100",
        "address_line1": "100 Main St",
        "address_line2": null,
        "city": "AUSTIN",
        "zip": "78701",
        "county": "TRAVIS"
      },
      "gov_url": "https://tsbpe.texas.gov/free-licensee-list/",
      "display_note": "License status as reported by TSBPE (source status field) on 2026-11-25. Re-check on the .gov lookup page before hiring."
    }
  ]
}
```

## 4. Display rules (spec v2 §5 — mandatory)

| Rule | Wording / behaviour |
|---|---|
| Never "Verified" | No "Verified" badge/label anywhere unless `verification_level = authority-confirmed` **with recorded evidence**. The standard line is `display_note` (see §3): "License status as reported in [source] on [date]". |
| Inferred (all TDLR rows) | `display_note` must say the status is inferred from the expiration date, not yet confirmed against a live `.gov` lookup, and that a not-expired license can still be suspended/revoked. Always show the "Kiểm tra lại trên trang .gov" link (`gov_url`). |
| Expired | Show prominently: "Expired — hết hạn ngày X". An expired license is a **result**, never "not found". |
| Not found | `found:false` + `guidance`: no license matched; the tool does not prove the contractor is unlicensed; link to the `.gov` lookup and suggest the exact license number or exact business name. Never invent a result. |
| Duplicate name | `ambiguous:true` + `guidance` asking the user to disambiguate (license number, city, or phone). Show every matching license with its status. Never silently pick one. The ambiguity is judged on business **id**, never on name — held clusters share one name across several businesses. |
| Cap | Name search returns at most 20 matches; `total_matches` reports the true count and the guidance notes when the list is capped. |
| Expired / suspended / revoked in results | List them with their status; do not hide them. |
| Logging | Count lookups only (spec v2 §5). Never store the searcher's PII. |
| Language | US English on the page (AGENTS.md rule 9). |

## 5. Status mapping (DB → display)

| `license_status` | `verification_level` | When it occurs |
|---|---|---|
| `active` | `authority-confirmed` | TSBPE RMP with `LIC_STATUS = Current` |
| `expired` | `authority-confirmed` | TSBPE RMP with `LIC_STATUS = Expired` |
| `active` / `expired` | `inferred` | TDLR (no status field; derived from `expiration_date` vs file date) |
| `suspended` / `revoked` | `authority-confirmed` | Only when a source (or a `.gov` lookup) reports it — **no such row exists in the current data**; the mapping is tested with a synthetic row only |
| `unknown` | `unverified` | Missing expiration date (does not occur in the current load: 0 rows) |

## 6. Data layer (already built — Sprint 02)

- `etl/src/lookup.ts` — `lookupByLicense(trade, number, db?)`,
  `lookupByName(query, trade|null, db?, limit=20)`. Read-only SELECTs
  through `etl/src/pg.ts` (local `psql`). Input is SQL-quoted and
  LIKE-escaped inside the module; the route must not build SQL itself.
- `etl/src/lookup-cli.ts` — same queries from the terminal; prints the
  `LookupResult` JSON above. Exit 0 on a successful query (including
  `found:false`); exit 2 on bad arguments, 1 on a DB error.
- Tests: `etl/tests/lookup.test.ts` (7 tests, scratch DB).

## 7. What Sprint 03 still has to build

- The Next.js 16 route + SSR page (`/verify/`, spec v2 §6.1) calling this
  data layer (or its ported equivalent — the ETL stays separate, no
  Next.js imports in `etl/`).
- Rate limiting on the tool + form anti-spam (spec v2 §6.5).
- Search logging (count only).
- Supabase as the database (local Postgres is the stand-in; ADR-0002).
- The `data_published_at` gate (spec v2 §4): only data-published records
  are visible in the tool. Currently nothing is published (verify check
  "no publication gates set" passes) — the gate must be wired before any
  public launch.
