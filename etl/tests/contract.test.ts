// Compatibility tests (T027, US12, data-contract.md §6).
// The JSON Schema file is the canonical contract; these tests validate
// sample records against it using the Python `jsonschema` package as the
// validation oracle (see tests/fixtures/validate_schema.py — the ETL is
// zero-dependency, so the oracle lives in the tests, not the engine).
// They also prove the versioning rules: an optional field is a minor
// addition (old records still validate), a breaking change needs a major
// bump + migration note, and the loader rejects unknown versions.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRecord } from "../src/validate.ts";
import type { NormalizedRecord } from "../src/normalize.ts";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SCHEMA_V1 = join(HERE, "..", "contract", "normalized-record.v1.json");
const SCHEMA_V11 = join(HERE, "fixtures", "normalized-record.v1.1.json");
const ORACLE = join(HERE, "fixtures", "validate_schema.py");

function baseRecord(): NormalizedRecord {
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
  };
}

// Returns true when the record validates against the schema.
function validatesAgainst(schemaPath: string, record: unknown): boolean {
  const dir = mkdtempSync(join(tmpdir(), "hcp-schema-"));
  const recordPath = join(dir, "record.json");
  writeFileSync(recordPath, JSON.stringify(record), "utf8");
  try {
    execFileSync("python3", [ORACLE, schemaPath, recordPath], {
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

describe("contract compatibility (T027)", () => {
  it("the schema's own example validates against the v1 schema", () => {
    const schema = JSON.parse(readFileSync(SCHEMA_V1, "utf8")) as {
      examples: unknown[];
    };
    assert.ok(schema.examples.length >= 1);
    assert.equal(validatesAgainst(SCHEMA_V1, schema.examples[0]), true);
  });

  it("a valid v1 record validates against the v1 schema", () => {
    assert.equal(validatesAgainst(SCHEMA_V1, baseRecord()), true);
  });

  it("missing required fields fail (license_number, contract_version, source.sha256_checksum)", () => {
    for (const mutate of [
      (r: Record<string, unknown>) => delete r["license_number"],
      (r: Record<string, unknown>) => delete r["contract_version"],
      (r: Record<string, unknown>) => {
        (r["source"] as Record<string, unknown>)["sha256_checksum"] = undefined;
        delete (r["source"] as Record<string, unknown>)["sha256_checksum"];
      },
    ]) {
      const rec = JSON.parse(JSON.stringify(baseRecord())) as Record<string, unknown>;
      mutate(rec);
      assert.equal(validatesAgainst(SCHEMA_V1, rec), false);
    }
  });

  it("invariant I1 is enforced by the schema (expiration_date + authority-confirmed fails)", () => {
    const bad = baseRecord();
    bad.verification_level = "authority-confirmed";
    assert.equal(validatesAgainst(SCHEMA_V1, bad), false);
    const good = baseRecord();
    assert.equal(validatesAgainst(SCHEMA_V1, good), true);
    const rmp = baseRecord();
    rmp.license_status_source = "source_field";
    rmp.verification_level = "authority-confirmed";
    rmp.source_code = "tsbpe-rmp";
    rmp.trade = "plumbing";
    assert.equal(validatesAgainst(SCHEMA_V1, rmp), true);
  });

  it("a bad checksum fails schema validation", () => {
    const rec = baseRecord();
    rec.source = { ...rec.source, sha256_checksum: "XYZ" };
    assert.equal(validatesAgainst(SCHEMA_V1, rec), false);
  });

  it("an unknown top-level field fails (additionalProperties: false)", () => {
    const rec = JSON.parse(JSON.stringify(baseRecord())) as Record<string, unknown>;
    rec["surprise_field"] = 1;
    assert.equal(validatesAgainst(SCHEMA_V1, rec), false);
  });

  it("a record carrying contract_version v2 FAILS against the v1 schema (const v1)", () => {
    const rec = baseRecord();
    rec.contract_version = "v2";
    assert.equal(validatesAgainst(SCHEMA_V1, rec), false);
  });

  it("minor version: an old v1 record still validates against the v1.1 schema", () => {
    assert.equal(validatesAgainst(SCHEMA_V11, baseRecord()), true);
  });

  it("minor version: a record using the new optional field validates against v1.1 but NOT v1", () => {
    const rec = JSON.parse(JSON.stringify(baseRecord())) as Record<string, unknown>;
    rec["notes"] = "operator note added in v1.1";
    assert.equal(validatesAgainst(SCHEMA_V11, rec), true);
    assert.equal(validatesAgainst(SCHEMA_V1, rec), false);
  });

  it("the loader rejects an unknown contract version before any DB write (L8)", () => {
    const rec = baseRecord();
    rec.contract_version = "v2";
    const errors = validateRecord(rec);
    assert.ok(errors.some((e) => e.includes("unsupported contract_version")));
  });

  it("the TypeScript validator agrees with the schema oracle on the I1 cases", () => {
    const bad = baseRecord();
    bad.verification_level = "authority-confirmed";
    assert.ok(validateRecord(bad).some((e) => e.includes("invariant I1")));
    assert.deepEqual(validateRecord(baseRecord()), []);
  });
});
