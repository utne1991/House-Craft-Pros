// License lookup for the Verify tool (Sprint 02, spec v2 §5–§6.1).
//
// READ-ONLY: every query is a SELECT through etl/src/pg.ts (local psql).
// This module is the data layer the future Next.js /verify/ route will call;
// it runs locally only — there is no HTTP server in this sprint.
//
// Rules enforced here (spec v2 §5, AGENTS.md rule 3):
// - license_status and verification_level are NEVER collapsed: the output
//   always carries both, plus license_status_source and status_as_of.
// - Nothing is labelled "Verified": the display note always says the status
//   is "as reported in [source] on [date]", with a link to re-check on .gov.
// - A license number that is not found returns found:false + guidance to
//   check on .gov; the tool never invents a result.
// - A name that matches more than one business returns ALL matches with
//   ambiguous:true; the caller must ask the user to disambiguate, never
//   silently pick one.
//
// Usage (library):
//   lookupByLicense("plumbing", "1001")
//   lookupByName("SMITH PLUMBING LLC", "electrical")

import { DB_NAME, psqlJson } from "./pg.ts";
import { normalizeName } from "./normalize.ts";

export const TRADES = ["electrical", "hvac", "plumbing"] as const;
export type Trade = (typeof TRADES)[number];

// Trade -> data_sources.code (etl/config/sources.json).
export const TRADE_SOURCE: Record<Trade, string> = {
  electrical: "tdlr-electrical",
  hvac: "tdlr-hvac",
  plumbing: "tsbpe-rmp",
};

// .gov pages where a homeowner can re-check the same license.
export const GOV_URLS: Record<Trade, string> = {
  electrical: "https://www.tdlr.texas.gov/licenseSearch/licfile.asp",
  hvac: "https://www.tdlr.texas.gov/licenseSearch/licfile.asp",
  plumbing: "https://tsbpe.texas.gov/free-licensee-list/",
};

export const GOV_AGENCY: Record<Trade, string> = {
  electrical: "TDLR",
  hvac: "TDLR",
  plumbing: "TSBPE",
};

export interface LookupBusiness {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  /** Business id — the identity ambiguity is judged on, never the name:
   *  held clusters share one name across several businesses. */
  id: string;
  name: string;
  phone: string | null;
  zip: string | null;
}

export interface LookupMatch {
  business: LookupBusiness;
  display_note: string;
  endorsements: string[];
  expiration_date: string | null;
  gov_url: string;
  holder: string | null;
  issue_date: string | null;
  license_number: string;
  license_status: string;
  license_status_source: string;
  license_subtype: string | null;
  license_type: string;
  status_as_of: string;
  trade: Trade;
  verification_level: string;
}

export interface LookupResult {
  ambiguous: boolean;
  found: boolean;
  guidance: string | null;
  matches: LookupMatch[];
  /** Total matches before the per-query cap (== matches.length when uncapped). */
  total_matches: number;
}

const MATCH_COLUMNS = `
  l.license_number, l.license_type, l.license_subtype,
  l.expiration_date::text AS expiration_date,
  l.issue_date::text AS issue_date,
  l.license_status, l.verification_level, l.license_status_source,
  l.status_as_of::text AS status_as_of,
  l.endorsements,
  b.name AS business_name, b.phone AS business_phone,
  b.id AS business_id,
  b.address_line1, b.address_line2, b.city, b.county, b.zip,
  h.full_name AS holder_name
`;

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function displayNote(
  trade: Trade,
  verificationLevel: string,
  statusAsOf: string,
): string {
  const agency = GOV_AGENCY[trade];
  if (verificationLevel === "authority-confirmed") {
    return `License status as reported by ${agency} (source status field) on ${statusAsOf}. Re-check on the .gov lookup page before hiring.`;
  }
  if (verificationLevel === "inferred") {
    return `License status as reported in the ${agency} license file dated ${statusAsOf} — inferred from the expiration date, not yet confirmed against a live .gov lookup. A license that has not expired can still be suspended or revoked. Re-check on the .gov lookup page before hiring.`;
  }
  return `License status could not be determined from the ${agency} file dated ${statusAsOf}. Re-check on the .gov lookup page before hiring.`;
}

interface MatchRow {
  address_line1: string | null;
  address_line2: string | null;
  business_id: string;
  business_name: string;
  business_phone: string | null;
  city: string | null;
  county: string | null;
  endorsements: string[];
  expiration_date: string | null;
  holder_name: string | null;
  issue_date: string | null;
  license_number: string;
  license_status: string;
  license_status_source: string;
  license_subtype: string | null;
  license_type: string;
  status_as_of: string;
  verification_level: string;
  zip: string | null;
}

function toMatch(row: MatchRow, trade: Trade): LookupMatch {
  return {
    business: {
      address_line1: row.address_line1,
      address_line2: row.address_line2,
      city: row.city,
      county: row.county,
      id: row.business_id,
      name: row.business_name,
      phone: row.business_phone,
      zip: row.zip,
    },
    display_note: displayNote(trade, row.verification_level, row.status_as_of),
    endorsements: Array.isArray(row.endorsements) ? row.endorsements : [],
    expiration_date: row.expiration_date,
    gov_url: GOV_URLS[trade],
    holder: row.holder_name,
    issue_date: row.issue_date,
    license_number: row.license_number,
    license_status: row.license_status,
    license_status_source: row.license_status_source,
    license_subtype: row.license_subtype,
    license_type: row.license_type,
    status_as_of: row.status_as_of,
    trade,
    verification_level: row.verification_level,
  };
}

function runMatchQuery(db: string, where: string, trade: Trade): LookupMatch[] {
  const rows = psqlJson<MatchRow[]>(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT ${MATCH_COLUMNS}
       FROM licenses l
       JOIN businesses b ON b.id = l.business_id
       LEFT JOIN license_holders h ON h.id = l.holder_id
       WHERE ${where}
       ORDER BY l.license_number
     ) t;`,
  );
  return rows.map((r) => toMatch(r, trade));
}

function notFoundGuidance(trade: Trade | null, what: string): string {
  const where =
    trade === null
      ? "the TDLR (electrical / HVAC) or TSBPE (plumbing) lookup pages"
      : `the ${GOV_AGENCY[trade]} lookup page (${GOV_URLS[trade]})`;
  return `No license matching ${what} was found in the House Craft Pros database (Texas TDLR + TSBPE files as of the last load). That does not prove the contractor is unlicensed — check ${where} directly, and try the exact license number or the exact business name as printed on the license.`;
}

/** Look up one license by number within one trade. Exact match (trimmed). */
export function lookupByLicense(
  trade: Trade,
  licenseNumber: string,
  db: string = DB_NAME,
): LookupResult {
  const num = licenseNumber.trim();
  if (num === "") {
    return { ambiguous: false, found: false, guidance: "A license number is required.", matches: [], total_matches: 0 };
  }
  const matches = runMatchQuery(
    db,
    `l.source_id = (SELECT id FROM data_sources WHERE code = ${sqlQuote(TRADE_SOURCE[trade])}) AND l.license_number = ${sqlQuote(num)}`,
    trade,
  );
  if (matches.length === 0) {
    return {
      ambiguous: false,
      found: false,
      guidance: notFoundGuidance(trade, `license number ${num} (${trade})`),
      matches: [],
      total_matches: 0,
    };
  }
  return { ambiguous: false, found: true, guidance: null, matches, total_matches: matches.length };
}

/**
 * Look up by business name, optionally within one trade. Matches on the
 * normalized name (same normalization as the ETL dedupe key). Returns every
 * matching license; ambiguous:true when more than one distinct business
 * matches — the caller must disambiguate, never silently pick one.
 */
export function lookupByName(
  query: string,
  trade: Trade | null = null,
  db: string = DB_NAME,
  limit = 20,
): LookupResult {
  const norm = normalizeName(query);
  if (norm === null) {
    return { ambiguous: false, found: false, guidance: "A business name is required.", matches: [], total_matches: 0 };
  }
  const like = `%${escapeLike(norm)}%`;
  // Name search spans trades when no trade is given: run one query per
  // trade (the trade of a match is its source's trade).
  const tradesToSearch: Trade[] = trade === null ? [...TRADES] : [trade];
  const matches: LookupMatch[] = [];
  for (const t of tradesToSearch) {
    const rows = runMatchQuery(
      db,
      `b.normalized_name LIKE ${sqlQuote(like)} ESCAPE '\\' AND l.source_id = (SELECT id FROM data_sources WHERE code = ${sqlQuote(TRADE_SOURCE[t])})`,
      t,
    );
    matches.push(...rows);
  }
  // Distinct-business count and ambiguity are computed on the FULL match
  // list, before the cap — a capped list must not under-report ambiguity.
  // Identity is the business id, never the name: held clusters share one
  // name across several businesses.
  const distinctBusinesses = new Set(matches.map((m) => m.business.id));
  const capped = matches.slice(0, limit);
  if (capped.length === 0) {
    return {
      ambiguous: false,
      found: false,
      guidance: notFoundGuidance(trade, `business name "${query}"`),
      matches: [],
      total_matches: 0,
    };
  }
  return {
    ambiguous: distinctBusinesses.size > 1,
    found: true,
    guidance:
      distinctBusinesses.size > 1
        ? `${distinctBusinesses.size} businesses match "${query}"${matches.length > limit ? ` (showing the first ${limit} of ${matches.length} licenses)` : ""}. Ask the user which one they mean (license number, city, or phone), and show the license status of each — never pick one silently.`
        : null,
    matches: capped,
    total_matches: matches.length,
  };
}
