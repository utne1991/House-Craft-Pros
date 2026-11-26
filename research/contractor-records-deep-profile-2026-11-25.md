# Contractor Records (contractorrecords.com) — Deep Profile, Research Batch 2

**Date:** 25/11/2026 · **Read:** contractorrecords.com homepage, /cities list, Dallas license-lookup guide, state license guides (LA, AL, NJ), "sites like Angi" comparison, permit-fee guide. All figures below are as published on those pages, with the read date noted. No account, no payment, no API use — public web pages only.

## 1. What it is

Contractor Records is a free homeowner lookup built on **city building-permit files**. Tagline: "Hire someone who finishes the job." Positioning: the permit file is "the one record a contractor cannot write for itself: the city issues the permit, inspects the work and marks it finished or not."

Business model: **takes money from nobody**. Free for homeowners, no account, no ads, no paid listings, no paid rank movement. Their own comparison table (13 sites) lists Contractor Records as the only one that "charges nobody" — every other site is paid by the businesses it lists (leads, ads, dues, referral fees). No paid tier, no API, no data download observed.

## 2. Scale (as published 25/11/2026)

| Figure | Value | Source |
|---|---|---|
| Building permits on file | **1,571,825** | homepage + /cities |
| Contractor names on file | **122,587** | homepage |
| Firms (same 1,571,825 permits) | **173,628** | "sites like Angi" page |
| Full-coverage cities/counties (firm lists + license match) | **57** | homepage + /cities |
| Counts-only places (permit data, no firm lists) | **115** | /cities |
| Total places with data | **172** | /cities |
| Data freshness | Through **September 2026** in 54 of 57 cities; read **monthly** | homepage |
| Permits ≥1 year old finished + closed | **77%** | homepage |

**Discrepancy flagged, not resolved:** homepage says 122,587 contractor names; the "sites like Angi" page says 173,628 firms for the same 1,571,825 permits. Possible cause: distinct names vs firm records (e.g. name variants counted separately). Do not quote a single firm count without the source page. Permit count (1,571,825) is consistent across pages.

Largest full-coverage cities: Nashville TN 121,932 · New York City 107,397 · Colorado Springs 101,680 · **Austin TX 87,588** · Columbus OH 75,332 · Minneapolis 74,258 · Seattle 63,674 · Saint Paul 59,716 · Chicago 51,700 · Greensboro NC 49,860 · Orlando FL 42,936 · San Diego CA 42,447.

## 3. Data sources and method

- **Primary source: city open permit files** (e.g. Dallas OpenData Building Permits, Accela/DallasNow, city permit-map layers). Window typically **Oct 2024 – Sep 2026** (2 years); denied and withdrawn permits excluded.
- **Join:** permit file matched **by firm name** to the state license board (where the state publishes one) and to the property roll (home values by ZIP/county assessor). Read monthly; each page carries a "data through [date]" stamp and a dated Sources list.
- **A city joins** the 57 only when its public record (a) names the contractor, (b) records the final inspection, and (c) ties to the property roll. Otherwise it lands in the 115 counts-only tier.
- **License match is by name, not license number.** Their own FAQ: "Our pages match licenses by name, which can miss one, so the board's record is the one to trust." No license-number-anchored matching.
- **Filed values are applicant-written** (what the contractor wrote on the permit), not quotes or final bills. They state this explicitly on cost pages.
- **Guides** quote primary sources with read dates: city fee schedules, registration forms, board lookup pages (TDLR License Search, TSBPE public search, TCEQ irrigator search), Building Inspection FAQs.

## 4. What the product shows

- **Per-firm pages** (57 cities only): every permit pulled in that city, how many the city closed out, usual filed job value, time to final inspection, license match, kinds of homes worked on by ZIP. User sets weights; the list re-sorts.
- **Per-city pages:** permit counts by kind of work, 2-year window + last-12-months split, permit statistics (months), permits by ZIP.
- **Cost guides:** usual filed value per job type by city (e.g. Aspen: electrical $8,000, plumbing $19,227, remodel $54,175, roof $57,325); splits by home-value thirds; seasonality (roofing peaks May, index 200).
- **Fee guides:** permit fee for a $20,000 remodel in 20 cities (median ~$225; Cleveland $100 → Citrus Heights $740.14), from official fee schedules read Oct 2026.
- **State license guides:** "How to check a contractor's license in [state]" — license types, thresholds, board lookups, plus "Our permit data in [state]" tables. Dallas guide covers TDLR + TSBPE + City of Dallas registration + homeowner exemption.
- **Cross-city benchmark guides:** verify in 3 checks (24 states), permit history lookup (52 cities), red flags, 10 questions, address search (46 cities), licensed vs unlicensed (23 cities), permit timing (45 cities), slowest/fastest (43 cities), % never final (46 cities — median 19.5% electrical, 21.4% remodels), water heater rules (12 cities), open permits at sale, HVAC cost (16 cities), ADU (12 cities), addition (14 cities).
- **Deliberately absent:** no reviews ("A passed inspection beats a one-star rant"), no background checks (no criminal/credit/court records), no rating/ranking of firms where the permit file cannot support it.

## 5. Texas coverage — the decisive finding

### Full coverage (firm lists + license match): 5 places

| Place | Permits on file |
|---|---|
| Austin | 87,588 (4,869 contractors — #4 nationally) |
| Denton | 15,700 |
| Sugar Land | 14,977 |
| Tyler | 13,268 |
| Waco | 15,493 |

### Counts-only (permit stats, NO firm lists, NO license-matched firm pages): 14 places

Arlington 9,326 · Brownsville 3,268 · College Station 10,055 · Corpus Christi 33,542 · **Dallas 123,233** · El Paso 2,565 · Irving 14,557 · Longview 5,599 · McKinney 4,194 · Murphy 2,115 · New Braunfels 13,252 · **San Antonio 129,531** · San Marcos 4,116 · Wylie 2,552.

### Not covered at all: Houston (absent from both lists)

### What this means for our 4 launch cities (San Antonio → Dallas → Houston → Austin)

| City | Contractor Records position | Our position |
|---|---|---|
| **San Antonio (opening city)** | Counts only — 129,531 permits but **no firm lists** (their largest Texas file, and they cannot use it at firm level) | **Clear field.** Statewide license data covers every SA contractor; they have no firm-level answer here. |
| **Dallas** | Counts only — 123,233 permits, no firm lists. Their own admission: contractor name missing on **>50%** of Dallas permits, so they "do not rate, rank or profile firms from it"; open file has no status or final-inspection date. | **Clear field** at firm level; their Dallas guide is a how-to, not a directory. |
| **Houston** | **No coverage at all** — not in the 57, not in the 115. | **Clear field.** |
| **Austin** | **Their Texas stronghold** — full coverage, 87,588 permits, 4,869 contractors, #4 nationally. | Head-on overlap in Austin only. Our differentiator there must be license-number precision + statewide depth, not permit history. |

Net: in 3 of our 4 launch cities, Contractor Records has no firm-level product. Their Texas strength is concentrated in Austin + 4 smaller cities.

## 6. Strengths

1. **Ungameable evidence.** The permit file is issued by the city; a contractor cannot write its own record. Finished/closed share + time-to-final are measurements no listing site can fake.
2. **Monthly refresh with dated reads.** Every page stamps "data through [date]" and lists sources with read dates — the same discipline our spec demands.
3. **Honest limitations, stated on-page.** Name-match can miss; filed value ≠ price; registration is paperwork, not a skill test; no firm ranking where the file cannot support it. This builds trust and is a model for our own limitation wording.
4. **Guide engine as SEO moat.** State license how-tos, cost guides from real filed values, fee schedules, cross-city benchmarks — all built from the same permit dataset. This is the content model to study for our pillar/guides.
5. **No-pay model.** "Nobody paid to be on this page and nobody can" — same trust claim as ours; they prove it by showing the record, not by asserting it.

## 7. Weaknesses (gaps our wedge exploits)

1. **License match by name only.** Can miss licenses; no license-number anchoring. Our TDLR/TSBPE CSVs are keyed by license number — strictly more precise, and our conservative dedupe (held clusters, never auto-merged) is the correct answer to the same matching problem.
2. **City-permit-file dependent.** Coverage exists only where the city's open record names the contractor + records final inspection + ties to the property roll. Dallas and San Antonio — our first two cities — fail that test for firm-level data.
3. **No firm data for unlicensed trades.** GCs, roofers, remodelers have no state license in Texas; Contractor Records can only show their permits where the file names them. Our license-first model has the same boundary — neither side "verifies" a GC license that does not exist.
4. **No reviews, no API, no data download.** Deliberate (reviews) or absent (API) — either way, no programmatic access observed; lookup is web-only by company name.
5. **2-year window; filed values are applicant-written.** Not a lifetime history, not a price.
6. **Coverage quality varies by place.** Some states/places are counts-only (AL, NJ, Philadelphia examples) with no license matching at all. A user cannot tell from the homepage alone which tier a city is in — must open the city page.

## 8. Head-to-head vs our wedge

| Dimension | Contractor Records | House Craft Pros (planned) |
|---|---|---|
| Core evidence | City permit file (what work, finished?, what it cost) | State license file (is the license real, active?, who holds it) |
| Match key | Firm **name** | **License number** (TDLR/TSBPE CSVs) |
| Coverage | 57 cities full, 115 counts-only; TX: 5 full, 14 counts-only, Houston absent | **Statewide Texas**, all cities, 3 trades (43,976 licenses in dry-run) |
| San Antonio / Dallas / Houston | Counts-only / counts-only / absent | Full license coverage |
| Austin | Full (stronghold) | Full license coverage; permit history is the gap |
| Verification wording | "Board's record is the one to trust" (defers to board) | 3-state model: authority-confirmed / inferred / unverified; link to .gov lookup |
| Reviews | None (deliberate) | None (same rule: no AggregateRating without real reviews) |
| Monetisation | Nobody pays (no model stated) | Freemium planned (spec §9); paid placement never changes verification |
| Claim flow | None observed | /claim/ with manual phone verification (no SMS) |

The two products answer **different questions**: theirs — "did this firm finish permitted work, and at what filed value?"; ours — "is this contractor's license real and active right now?" They are complements, not substitutes. The overlap is the "verify a contractor" intent and the Austin market.

## 9. Implications for House Craft Pros

1. **Lead with license verification statewide; do not race them on permit history in Austin.** Our wedge is strongest exactly where they are weakest (San Antonio, Dallas, Houston).
2. **Permit data is a Phase 2 enrichment source, not a Sprint 02 dependency.** Dallas OpenData + San Antonio open permit files are public; evaluate after MVP whether to add "permits pulled / finished share" to contractor profiles. Do not scope it into Sprint 02.
3. **Copy their guide discipline, not their data.** Dated reads, "data through" stamps, Sources lists, honest limitation sections — our pillar/guides should match this. Our §6.2.1 (concrete truth + 8-question checklist) already points this way.
4. **Their name-match weakness validates our conservatism.** Held clusters (1,355) + never-auto-merge + license-number anchoring is the right answer; say so in the review-workflow doc.
5. **Watch item — recheck quarterly.** If they add firm lists for San Antonio/Houston (their two largest Texas files are counts-only today: SA 129,531, Dallas 123,233), the wedge narrows in our launch cities. Recheck /cities each quarter.
6. **Do not copy their firm counts without the source page.** 122,587 vs 173,628 discrepancy (see §2) — cite the page you read.

## 10. Adjacent competitors noted (not deep-profiled)

- **ContractorsRanked.com** (contractorsranked.com) — Texas ranking directory: 400 Texas cities, 36 trades, CR Score 0–100, "Rankings can't be bought. Featured businesses are labelled, never numbered and never change a rank." Houston 5,012 · San Antonio 3,136 · Austin 2,954 · Dallas 2,625 businesses. Updated 24/11/2026. Distinct from Contractor Records (ranking vs permit-evidence). Needs its own deep profile in a later batch.
- **ContractorRoster** (contractorroster.com) — B2B lead-data seller: 879,000+ records, 34 states, 33 trades; REST API + MCP + npm SDK; $0.10/record ($0.07 CRM), $9,900 full DB one-time, $899/quarter updates. Different customer (lead buyers, not homeowners).
- **67Leads** (67leads.com) — B2B lead lists; e.g. 822 concrete contractors in Texas; first 67 leads free, then 1,000 leads $6.70.
- **Loomwise / Apify** — TDLR HVAC+electrical lookup tool; free $5 credit (~2,500 records/mo), then $2/1,000 records.
- **PermitWarden** (permitwarden.com) — free Texas contractor lookup tool linking to official TDLR search. Closest to our /verify/ wedge at tool level; not deep-profiled yet.

## 11. Open verification items

- "How we read each file" methodology page (linked from /cities) — not read in full.
- Whether any API or bulk-access route exists — none found on pages read; not confirmed absent.
- Firm-count discrepancy (122,587 vs 173,628) — unresolved; see §2.
- Recheck /cities quarterly for San Antonio/Houston tier changes.

## 12. Sources (read 25/11/2026, all free public pages)

- https://contractorrecords.com/ (homepage)
- https://contractorrecords.com/cities (172 places: 57 full + 115 counts-only)
- https://contractorrecords.com/guides/dallas-contractor-license-lookup
- https://contractorrecords.com/guides/sites-like-angi-that-are-free
- https://contractorrecords.com/guides/how-much-does-a-building-permit-cost
- https://contractorrecords.com/guides/check-contractor-license-louisiana
- https://contractorrecords.com/guides/check-contractor-license-alabama
- https://contractorrecords.com/guides/check-contractor-license-new-jersey
- https://contractorrecords.com/guides/philadelphia-electrical-permit
- https://www.contractorsranked.com/contractors/texas
- https://apis.io/providers/contractorroster-com/
- https://67leads.com/leads/concrete/tx
- https://loomwise.app/data/texas-hvac-electrical-contractor-leads/
- https://permitwarden.com/tools/license-lookup/texas
