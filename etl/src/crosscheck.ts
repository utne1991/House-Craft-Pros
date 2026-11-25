// Cross-check (T024, US7): verify >= 100 sampled licenses field-by-field
// against their source CSV rows, spread across the 3 trades and the
// statuses present in the real data.
//
// Method: dump the loaded rows from Postgres, re-parse + re-normalize the
// source CSVs with the same adapters the ETL used, then compare every
// mapped field. The comparison catches load/SQL errors (wrong column,
// bad cast, lost row, wrong status derivation); the shared normalizer is
// covered separately by the unit tests.
//
// Output (repo, no PII — only license numbers, trade/status, and per-field
// pass/fail booleans): etl/evidence/crosscheck-2026-11-25.json
// A detailed value-level diff (for debugging) stays in /tmp only.
//
// Usage: node src/crosscheck.ts [--staging /tmp/hcp-etl]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { parseCsv } from "./csv.ts";
import { normalizeName, normalizeRow, type NormalizeContext, type NormalizedRecord } from "./normalize.ts";

const STAGING = process.argv.includes("--staging")
  ? process.argv[process.argv.indexOf("--staging") + 1]
  : "/tmp/hcp-etl";

const SOURCES = [
  {
    code: "tdlr-electrical",
    file: join(STAGING, "staging", "tdlr-electrical", "Lteecele.csv"),
    sha256: "",
    trade: "electrical",
  },
  {
    code: "tdlr-hvac",
    file: join(STAGING, "staging", "tdlr-hvac", "ltairref.csv"),
    sha256: "",
    trade: "hvac",
  },
  {
    code: "tsbpe-rmp",
    file: join(STAGING, "staging", "tsbpe-rmp", "rmp_download"),
    sha256: "",
    trade: "plumbing",
  },
];

interface DbRow {
  address_city: string | null;
  address_county: string | null;
  address_county_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_state: string | null;
  address_zip: string | null;
  business_name: string | null;
  endorsements: string;
  expiration_date: string | null;
  holder_full_name: string | null;
  insurance_company: string | null;
  insurance_expiry_date: string | null;
  issue_date: string | null;
  license_number: string;
  license_status: string;
  license_status_source: string;
  license_subtype: string | null;
  license_type: string;
  phone: string | null;
  phone_normalized: string | null;
  trade: string;
  verification_level: string;
}

const FIELDS: Array<{ db: keyof DbRow; rec: (r: NormalizedRecord) => string | null }> = [
  { db: "license_number", rec: (r) => r.license_number },
  { db: "license_type", rec: (r) => r.license_type },
  { db: "license_subtype", rec: (r) => r.license_subtype },
  { db: "expiration_date", rec: (r) => r.expiration_date },
  { db: "issue_date", rec: (r) => r.issue_date },
  { db: "license_status", rec: (r) => r.license_status },
  { db: "verification_level", rec: (r) => r.verification_level },
  { db: "license_status_source", rec: (r) => r.license_status_source },
  { db: "business_name", rec: (r) => r.business_name },
  { db: "holder_full_name", rec: (r) => r.holder?.full_name ?? null },
  { db: "phone", rec: (r) => r.phone },
  { db: "phone_normalized", rec: (r) => r.phone_normalized },
  { db: "address_line1", rec: (r) => r.address?.line1 ?? null },
  { db: "address_line2", rec: (r) => r.address?.line2 ?? null },
  { db: "address_city", rec: (r) => r.address?.city ?? null },
  { db: "address_state", rec: (r) => r.address?.state ?? null },
  { db: "address_zip", rec: (r) => r.address?.zip ?? null },
  { db: "address_county", rec: (r) => r.address?.county ?? null },
  { db: "address_county_code", rec: (r) => r.address?.county_code ?? null },
  { db: "insurance_company", rec: (r) => r.insurance?.company ?? null },
  { db: "insurance_expiry_date", rec: (r) => r.insurance?.expiry_date ?? null },
];

function normDb(value: string | null): string | null {
  return value === null || value === "" ? null : value;
}

function main(): void {
  // 1. Dump the loaded rows from Postgres (COPY to a /tmp TSV).
  const dumpPath = join(STAGING, "crosscheck-db.tsv");
  const copySql = `\\copy (SELECT b.id, l.trade, l.license_type, l.license_number, l.license_subtype, l.expiration_date::text, l.issue_date::text, l.license_status, l.verification_level, l.license_status_source, b.name, h.full_name, b.phone, b.phone_normalized, b.address_line1, b.address_line2, b.city, b.state_code, b.zip, b.county, l.endorsements::text, l.insurance_company, l.insurance_expiry_date::text FROM licenses l JOIN businesses b ON b.id = l.business_id LEFT JOIN license_holders h ON h.id = l.holder_id) TO '${dumpPath}' WITH (FORMAT text, DELIMITER E'\\t', NULL '\\N')`;
  const queryFile = join(STAGING, "crosscheck-query.sql");
  writeFileSync(queryFile, copySql, "utf8");
  execFileSync("chmod", ["644", queryFile]);
  // \copy writes the dump file as the postgres user: pre-create it
  // world-writable so the write succeeds.
  writeFileSync(dumpPath, "", "utf8");
  execFileSync("chmod", ["666", dumpPath]);
  execFileSync("su", ["postgres", "-c", `psql -d housecraftpros -v ON_ERROR_STOP=1 -q -f ${queryFile}`], { encoding: "utf8" });

  // The COPY column order is: business_id, trade, license_type, license_number, subtype,
  // expiration, issue, status, verification, status_source, business_name,
  // holder, phone, phone_norm, line1, line2, city, state, zip, county,
  // endorsements(json), insurance_company, insurance_expiry.
  // NOTE: businesses.phone/address are the BUSINESS fields — but a license
  // shares its business row with other licenses, so the business fields in
  // the dump may come from a merged sibling, not from this license's own
  // CSV row. The cross-check therefore compares business fields against
  // the record's own row ONLY for single-license businesses; for merged
  // businesses it compares the business NAME (which is the merge key) and
  // skips phone/address (they may legitimately be enriched from a sibling).
  const dbByKey = new Map<string, DbRow>();
  const dbBusinessLicenseCount = new Map<string, number>();
  const dbBusinessIdByKey = new Map<string, string>();
  for (const line of readFileSync(dumpPath, "utf8").split("\n")) {
    if (line === "") continue;
    const c = line.split("\t").map((v) => (v === "\\N" ? null : v));
    const businessId = c[0] as string;
    const row: DbRow = {
      address_city: normDb(c[16]),
      address_county: normDb(c[19]),
      address_county_code: null, // not stored on the license row; compared via record only
      address_line1: normDb(c[14]),
      address_line2: normDb(c[15]),
      address_state: normDb(c[17]),
      address_zip: normDb(c[18]),
      business_name: normDb(c[10]),
      endorsements: c[20] ?? "[]",
      expiration_date: normDb(c[5]),
      holder_full_name: normDb(c[11]),
      insurance_company: normDb(c[21]),
      insurance_expiry_date: normDb(c[22]),
      issue_date: normDb(c[6]),
      license_number: c[3] as string,
      license_status: c[7] as string,
      license_status_source: c[9] as string,
      license_subtype: normDb(c[4]),
      license_type: c[2] as string,
      phone: normDb(c[12]),
      phone_normalized: normDb(c[13]),
      trade: c[1] as string,
      verification_level: c[8] as string,
    };
    dbByKey.set(`${row.trade}\n${row.license_type}\n${row.license_number}`, row);
    dbBusinessLicenseCount.set(
      businessId,
      (dbBusinessLicenseCount.get(businessId) ?? 0) + 1,
    );
    dbBusinessIdByKey.set(`${row.trade}\n${row.license_type}\n${row.license_number}`, businessId);
  }

  // 2. Re-parse + re-normalize the source CSVs.
  const byStratum = new Map<string, NormalizedRecord[]>();
  for (const src of SOURCES) {
    const text = readFileSync(src.file, "utf8");
    const parsed = parseCsv(text);
    const ctx: NormalizeContext = {
      asOfDate: src.code === "tsbpe-rmp" ? "2026-11-25" : "2026-11-24",
      fileDate: src.code === "tsbpe-rmp" ? null : "2026-11-24",
      fileName: src.file.split("/").pop() as string,
      sha256: "0".repeat(64),
      sourceCode: src.code,
      sourceUrl: null,
      trade: src.trade,
    };
    for (let i = 0; i < parsed.rows.length; i++) {
      const rec = normalizeRow(parsed.rows[i], ctx, i + 2);
      const key = `${rec.trade}|${rec.license_status}`;
      const list = byStratum.get(key) ?? [];
      list.push(rec);
      byStratum.set(key, list);
    }
  }
  for (const list of byStratum.values()) {
    list.sort((a, b) => (a.license_number < b.license_number ? -1 : 1));
  }

  // 3. Stratified sample: 100 total, >= 8 per stratum, rest proportional.
  const strata = [...byStratum.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const total = strata.reduce((n, [, list]) => n + list.length, 0);
  const alloc = new Map<string, number>();
  let assigned = 0;
  for (const [key, list] of strata) {
    const n = Math.max(8, Math.round((100 * list.length) / total));
    alloc.set(key, n);
    assigned += n;
  }
  // Fix the sum to exactly 100 by trimming/adding to the largest stratum.
  const largest = strata.reduce((a, b) => (a[1].length >= b[1].length ? a : b))[0];
  alloc.set(largest, (alloc.get(largest) as number) + (100 - assigned));

  interface SampleResult {
    business_fields_compared: boolean;
    field_results: Record<string, boolean>;
    license_number: string;
    license_type: string;
    pass: boolean;
    status: string;
    trade: string;
  }
  const samples: SampleResult[] = [];
  const failures: Array<{ field: string; license_number: string; trade: string }> = [];
  for (const [key, list] of strata) {
    const n = alloc.get(key) as number;
    for (let k = 0; k < n; k++) {
      const idx = Math.floor((k * list.length) / n);
      const rec = list[idx];
      const db = dbByKey.get(`${rec.trade}\n${rec.license_type}\n${rec.license_number}`);
      if (!db) {
        samples.push({
          business_fields_compared: false,
          field_results: { found_in_db: false },
          license_number: rec.license_number,
          license_type: rec.license_type,
          pass: false,
          status: rec.license_status,
          trade: rec.trade,
        });
        failures.push({ field: "found_in_db", license_number: rec.license_number, trade: rec.trade });
        continue;
      }
      // Business fields: compare only when this business holds exactly
      // this one license in the DB (see note above); otherwise the
      // business row may legitimately carry a merged sibling's contact.
      const businessId = dbBusinessIdByKey.get(
        `${rec.trade}\n${rec.license_type}\n${rec.license_number}`,
      ) as string;
      const businessCount = dbBusinessLicenseCount.get(businessId) ?? 1;
      // Compare business contact fields only when this business holds
      // exactly this one license; a merged business row may legitimately
      // carry a sibling license's contact details.
      const compareBusiness = businessCount === 1;
      const fieldResults: Record<string, boolean> = {};
      let pass = true;
      for (const f of FIELDS) {
        if (f.db === "address_county_code") continue; // not persisted per-license
        const isBusinessField = [
          "phone", "phone_normalized",
          "address_line1", "address_line2", "address_city",
          "address_state", "address_zip", "address_county",
        ].includes(f.db);
        if (isBusinessField && !compareBusiness) continue;
        if (f.db === "business_name") {
          // Merged businesses share the normalized name (the merge key);
          // compare normalized forms, not raw casing/punctuation.
          const ok =
            normalizeName(db.business_name) ===
            (rec.business_name_normalized ??
              normalizeName(rec.holder?.full_name ?? null));
          fieldResults[f.db] = ok;
          if (!ok) {
            pass = false;
            failures.push({ field: f.db, license_number: rec.license_number, trade: rec.trade });
          }
          continue;
        }
        let expected = f.rec(rec);
        let actual: string | null = db[f.db] as string | null;
        if (f.db === "address_state" && expected === null) {
          // Load-time rule: businesses.state_code is NOT NULL, so a
          // missing source state defaults to 'TX' (the Texas source file)
          // at load time. The record itself keeps state NULL.
          expected = "TX";
        }
        if (f.db === "address_zip" && expected !== null && actual !== null) {
          // DB stores BUSINESS ZIP ("77031"); the record may carry the
          // ZIP+4 from the city cell ("77031-2516") when BUSINESS ZIP is
          // empty. Compare the 5-digit prefix in that case.
          if (actual.length === 5 && expected.startsWith(actual)) expected = actual;
        }
        const ok = normDb(expected) === normDb(actual);
        fieldResults[f.db] = ok;
        if (!ok) {
          pass = false;
          failures.push({ field: f.db, license_number: rec.license_number, trade: rec.trade });
        }
      }
      // Endorsements: compare as a sorted JSON array.
      const expectedEnd = JSON.stringify([...rec.endorsements].sort());
      const actualEnd = JSON.stringify(
        [...(JSON.parse(db.endorsements) as string[])].sort(),
      );
      fieldResults["endorsements"] = expectedEnd === actualEnd;
      if (expectedEnd !== actualEnd) {
        pass = false;
        failures.push({ field: "endorsements", license_number: rec.license_number, trade: rec.trade });
      }
      samples.push({
        business_fields_compared: compareBusiness,
        field_results: fieldResults,
        license_number: rec.license_number,
        license_type: rec.license_type,
        pass,
        status: rec.license_status,
        trade: rec.trade,
      });
    }
  }

  const passed = samples.filter((s) => s.pass).length;
  const byStratumSummary: Record<string, { fail: number; pass: number }> = {};
  for (const s of samples) {
    const key = `${s.trade}|${s.status}`;
    const entry = byStratumSummary[key] ?? { fail: 0, pass: 0 };
    if (s.pass) entry.pass += 1;
    else entry.fail += 1;
    byStratumSummary[key] = entry;
  }
  const report = {
    allocation: Object.fromEntries(alloc),
    by_stratum: byStratumSummary,
    failures,
    generated_at: new Date().toISOString(),
    method:
      "Stratified sample (100) across trade x status; each sampled license compared field-by-field (license number/type/subtype, dates, status, verification, status source, holder, business name/phone/address/county, endorsements, insurance) against its re-parsed source CSV row. Business contact fields compared only for single-license businesses (merged businesses may legitimately carry a sibling's contact). No PII values in this file — pass/fail booleans only.",
    sample_count: samples.length,
    samples,
    source: "PostgreSQL housecraftpros vs fresh CSVs downloaded 25/11/2026",
    summary: { fail: samples.length - passed, pass: passed },
  };
  const outDir = join("evidence");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "crosscheck-2026-11-25.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    JSON.stringify(
      {
        by_stratum: byStratumSummary,
        failures: failures.length,
        out: outPath,
        pass: passed,
        sample_count: samples.length,
      },
      null,
      2,
    ),
  );
  if (passed !== samples.length) process.exit(1);
}

main();
