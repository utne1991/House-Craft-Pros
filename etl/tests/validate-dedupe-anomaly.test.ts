// Tests: record validation (L1/L8, invariant I1) + dedupe rules (US3)
// + anomaly thresholds (US5). Pure functions — no database needed.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRecord } from "../src/validate.ts";
import { dedupe } from "../src/dedupe.ts";
import { checkAnomalies } from "../src/anomaly.ts";
import type { NormalizedRecord } from "../src/normalize.ts";

function baseRecord(overrides: Partial<NormalizedRecord> = {}): NormalizedRecord {
  return {
    address: {
      city: "Austin",
      county: "Travis",
      county_code: "0227",
      line1: "100 Example St",
      line2: null,
      state: "TX",
      zip: "78701",
    },
    business_name: "Example Electric LLC",
    business_name_normalized: "example electric llc",
    contract_version: "v1",
    endorsements: [],
    expiration_date: "2027-07-31",
    holder: {
      first_name: "Jane",
      full_name: "Jane Example",
      last_name: "Example",
      middle_name: null,
      suffix: null,
    },
    insurance: null,
    issue_date: null,
    license_number: "12345",
    license_status: "active",
    license_status_source: "expiration_date",
    license_subtype: "EC",
    license_type: "Electrical Contractor",
    phone: "(512) 555-0100",
    phone_normalized: "5125550100",
    source: {
      file_date: null,
      file_name: "Lteecele.csv",
      sha256_checksum: "0".repeat(64),
      source_url: "https://www.tdlr.texas.gov/",
    },
    source_code: "tdlr-electrical",
    status_as_of: "2026-11-24",
    trade: "electrical",
    verification_level: "inferred",
    ...overrides,
  };
}

describe("validateRecord", () => {
  it("accepts a valid TDLR record", () => {
    assert.deepEqual(validateRecord(baseRecord()), []);
  });

  it("accepts a TSBPE record with source_field + authority-confirmed", () => {
    assert.deepEqual(
      validateRecord(
        baseRecord({
          license_status_source: "source_field",
          source_code: "tsbpe-rmp",
          trade: "plumbing",
          verification_level: "authority-confirmed",
        }),
      ),
      [],
    );
  });

  it("rejects expiration_date derivation paired with authority-confirmed (I1)", () => {
    const errors = validateRecord(
      baseRecord({ verification_level: "authority-confirmed" }),
    );
    assert.ok(errors.some((e) => e.includes("invariant I1")));
  });

  it("rejects a missing required field", () => {
    const rec = baseRecord();
    // @ts-expect-error testing a malformed record
    delete rec.license_number;
    const errors = validateRecord(rec);
    assert.ok(errors.some((e) => e.includes("license_number")));
  });

  it("rejects a bad checksum", () => {
    const rec = baseRecord();
    rec.source = { ...rec.source, sha256_checksum: "xyz" };
    assert.ok(
      validateRecord(rec).some((e) => e.includes("sha256_checksum")),
    );
  });

  it("rejects an unknown top-level field", () => {
    const rec = baseRecord() as unknown as Record<string, unknown>;
    rec["surprise_field"] = 1;
    assert.ok(
      validateRecord(rec as unknown as NormalizedRecord).some((e) =>
        e.includes("unknown top-level field"),
      ),
    );
  });

  it("rejects an unknown contract version (L8)", () => {
    const rec = baseRecord({ contract_version: "v2" });
    assert.ok(
      validateRecord(rec).some((e) => e.includes("unsupported contract_version")),
    );
  });

  it("rejects a non-ISO date", () => {
    const rec = baseRecord({ expiration_date: "07/31/2027" });
    assert.ok(
      validateRecord(rec).some((e) => e.includes("expiration_date")),
    );
  });
});

describe("dedupe (conservative, US3)", () => {
  function rec(
    licenseNumber: string,
    businessName: string | null,
    phone: string | null,
    line1: string | null,
  ): NormalizedRecord {
    return baseRecord({
      address: {
        city: line1 === null ? null : "Austin",
        county: "Travis",
        county_code: null,
        line1,
        line2: null,
        state: "TX",
        zip: line1 === null ? null : "78701",
      },
      business_name: businessName,
      business_name_normalized:
        businessName === null
          ? null
          : businessName.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim(),
      license_number: licenseNumber,
      phone,
      phone_normalized: phone,
    });
  }

  it("merges on same name + same phone", () => {
    const out = dedupe([
      rec("1", "Acme Electric LLC", "5125550100", "100 Example St"),
      rec("2", "Acme Electric LLC", "5125550100", "200 Other St"),
    ]);
    assert.equal(out.assignments[0].businessKey, out.assignments[1].businessKey);
    assert.equal(out.assignments[0].dedupeStatus, "merged");
    assert.equal(out.decisions.length, 1);
    assert.equal(out.decisions[0].decision, "merged");
  });

  it("merges on same name + same address (no phone)", () => {
    const out = dedupe([
      rec("1", "Acme Electric LLC", null, "100 Example St"),
      rec("2", "Acme Electric LLC", null, "100 Example St"),
    ]);
    assert.equal(out.assignments[0].businessKey, out.assignments[1].businessKey);
    assert.equal(out.decisions[0].decision, "merged");
  });

  it("holds a name-only cluster for human review, never auto-merges", () => {
    const out = dedupe([
      rec("1", "Acme Electric LLC", null, null),
      rec("2", "Acme Electric LLC", null, null),
    ]);
    assert.notEqual(out.assignments[0].businessKey, out.assignments[1].businessKey);
    assert.equal(out.assignments[0].dedupeStatus, "ambiguous_held");
    assert.equal(out.decisions.length, 1);
    assert.equal(out.decisions[0].decision, "held_ambiguous");
    assert.equal(out.decisions[0].businessKey, null);
  });

  it("rejects a merge when the evidence conflicts (different phones)", () => {
    const out = dedupe([
      rec("1", "Acme Electric LLC", "5125550100", "100 Example St"),
      rec("2", "Acme Electric LLC", "5125559999", "200 Other St"),
    ]);
    assert.notEqual(out.assignments[0].businessKey, out.assignments[1].businessKey);
    assert.equal(out.decisions[0].decision, "rejected_no_merge");
  });

  it("leaves singletons alone with no decision row", () => {
    const out = dedupe([rec("1", "Solo Electric LLC", "5125550100", "100 Example St")]);
    assert.equal(out.assignments[0].dedupeStatus, "single");
    assert.equal(out.decisions.length, 0);
  });

  it("merges the evidenced subgroup and holds the rest when a cluster splits", () => {
    const out = dedupe([
      rec("1", "Acme Electric LLC", "5125550100", "100 Example St"),
      rec("2", "Acme Electric LLC", "5125550100", "100 Example St"),
      rec("3", "Acme Electric LLC", null, null),
    ]);
    // 1+2 share a phone -> one merged business; 3 has no evidence -> held.
    assert.equal(out.assignments[0].businessKey, out.assignments[1].businessKey);
    assert.equal(out.assignments[0].dedupeStatus, "merged");
    assert.notEqual(out.assignments[2].businessKey, out.assignments[0].businessKey);
    assert.equal(out.assignments[2].dedupeStatus, "ambiguous_held");
    assert.equal(
      out.decisions.filter((d) => d.decision === "merged").length,
      1,
    );
    assert.equal(
      out.decisions.filter((d) => d.decision === "held_ambiguous").length,
      1,
    );
  });

  it("is deterministic: same input gives the same decisions", () => {
    const input = [
      rec("1", "Acme Electric LLC", "5125550100", "100 Example St"),
      rec("2", "Acme Electric LLC", "5125550100", "200 Other St"),
      rec("3", "Acme Electric LLC", null, null),
    ];
    const a = dedupe(input);
    const b = dedupe(input);
    assert.deepEqual(a, b);
  });
});

describe("checkAnomalies (US5)", () => {
  const thresholds = {
    expired_share_jump_points: 10,
    parse_error_pct: 1,
    row_count_jump_pct: 10,
    unparseable_date_pct: 1,
  };
  const base = {
    currentRowCount: 14000,
    duplicateIdentityCount: 0,
    expiredSharePct: 12,
    parseErrorCount: 0,
    parseErrorRatePct: 0,
    previousExpiredSharePct: 12,
    previousRowCount: 14000,
    unparseableDateCount: 0,
    unparseableDateRatePct: 0,
  };

  it("passes a stable run", () => {
    assert.equal(checkAnomalies(base, thresholds).blocked, false);
  });

  it("blocks a row-count jump over 10%", () => {
    const v = checkAnomalies({ ...base, currentRowCount: 16000 }, thresholds);
    assert.equal(v.blocked, true);
    assert.ok(v.checks.some((c) => c.name === "row_count_jump" && c.blocked));
  });

  it("blocks any duplicate license identity within one file", () => {
    const v = checkAnomalies({ ...base, duplicateIdentityCount: 3 }, thresholds);
    assert.equal(v.blocked, true);
  });

  it("blocks a parse-error rate over 1%", () => {
    const v = checkAnomalies(
      { ...base, parseErrorCount: 200, parseErrorRatePct: 1.43 },
      thresholds,
    );
    assert.equal(v.blocked, true);
  });

  it("blocks an expired-share jump over 10 points", () => {
    const v = checkAnomalies({ ...base, expiredSharePct: 25 }, thresholds);
    assert.equal(v.blocked, true);
  });

  it("blocks an empty file", () => {
    const v = checkAnomalies({ ...base, currentRowCount: 0 }, thresholds);
    assert.equal(v.blocked, true);
  });

  it("skips the jump checks (does not block) with no previous run", () => {
    const v = checkAnomalies(
      { ...base, previousExpiredSharePct: null, previousRowCount: null },
      thresholds,
    );
    assert.equal(v.blocked, false);
  });
});
