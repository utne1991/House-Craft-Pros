// Record validation — the loader-side enforcement of the contract
// (data-contract.md §4, L1/L8). This is a TypeScript mirror of the JSON
// Schema invariants; the schema file itself remains the canonical source
// and is validated by the compatibility tests with the Python `jsonschema`
// oracle (T027). Any record failing here fails the run (no partial loads).

import type { NormalizedRecord } from "./normalize.ts";

export const SUPPORTED_CONTRACT_VERSIONS = ["v1"];

const TOP_LEVEL_FIELDS = new Set([
  "contract_version",
  "source_code",
  "trade",
  "license_type",
  "license_subtype",
  "license_number",
  "license_status",
  "license_status_source",
  "verification_level",
  "status_as_of",
  "expiration_date",
  "issue_date",
  "business_name",
  "business_name_normalized",
  "holder",
  "phone",
  "phone_normalized",
  "address",
  "endorsements",
  "insurance",
  "source",
  "raw_row",
]);

const REQUIRED_FIELDS = [
  "contract_version",
  "source_code",
  "trade",
  "license_type",
  "license_number",
  "license_status",
  "license_status_source",
  "verification_level",
  "status_as_of",
  "source",
];

const LICENSE_STATUSES = new Set([
  "active",
  "expired",
  "suspended",
  "revoked",
  "cancelled",
  "pending",
  "inactive",
  "unknown",
]);

const STATUS_SOURCES = new Set([
  "source_field",
  "expiration_date",
  "gov_lookup",
  "unknown",
]);

const VERIFICATION_LEVELS = new Set([
  "authority-confirmed",
  "inferred",
  "unverified",
]);

const TRADES = new Set(["electrical", "hvac", "plumbing"]);

const SOURCE_CODES = new Set(["tdlr-electrical", "tdlr-hvac", "tsbpe-rmp"]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHECKSUM_RE = /^[0-9a-f]{64}$/;
const PHONE_RE = /^[0-9]{10}$/;

function isIsoDate(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

// Returns a list of validation errors; empty = valid.
export function validateRecord(record: NormalizedRecord): string[] {
  const errors: string[] = [];
  const rec = record as unknown as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    if (!TOP_LEVEL_FIELDS.has(key)) errors.push(`unknown top-level field: ${key}`);
  }
  for (const field of REQUIRED_FIELDS) {
    if (rec[field] === undefined || rec[field] === null || rec[field] === "") {
      errors.push(`missing required field: ${field}`);
    }
  }
  if (
    typeof rec["contract_version"] === "string" &&
    !SUPPORTED_CONTRACT_VERSIONS.includes(rec["contract_version"])
  ) {
    errors.push(
      `unsupported contract_version: ${rec["contract_version"]} (loader supports: ${SUPPORTED_CONTRACT_VERSIONS.join(", ")})`,
    );
  }
  if (typeof rec["source_code"] === "string" && !SOURCE_CODES.has(rec["source_code"])) {
    errors.push(`unknown source_code: ${rec["source_code"]}`);
  }
  if (typeof rec["trade"] === "string" && !TRADES.has(rec["trade"])) {
    errors.push(`unknown trade: ${rec["trade"]}`);
  }
  if (
    typeof rec["license_status"] === "string" &&
    !LICENSE_STATUSES.has(rec["license_status"])
  ) {
    errors.push(`unknown license_status: ${rec["license_status"]}`);
  }
  if (
    typeof rec["license_status_source"] === "string" &&
    !STATUS_SOURCES.has(rec["license_status_source"])
  ) {
    errors.push(`unknown license_status_source: ${rec["license_status_source"]}`);
  }
  if (
    typeof rec["verification_level"] === "string" &&
    !VERIFICATION_LEVELS.has(rec["verification_level"])
  ) {
    errors.push(`unknown verification_level: ${rec["verification_level"]}`);
  }
  // Invariant I1 (also the DB CHECK licenses_inferred_rule + the schema
  // if/then): expiration_date derivation can NEVER be authority-confirmed.
  if (
    rec["license_status_source"] === "expiration_date" &&
    rec["verification_level"] === "authority-confirmed"
  ) {
    errors.push(
      "invariant I1 violated: license_status_source=expiration_date with verification_level=authority-confirmed",
    );
  }
  if (
    typeof rec["status_as_of"] === "string" &&
    !isIsoDate(rec["status_as_of"])
  ) {
    errors.push(`status_as_of is not an ISO date: ${rec["status_as_of"]}`);
  }
  for (const field of ["expiration_date", "issue_date"] as const) {
    const v = rec[field];
    if (v !== null && v !== undefined && !isIsoDate(v as string)) {
      errors.push(`${field} is not an ISO date: ${v}`);
    }
  }
  if (
    typeof rec["phone_normalized"] === "string" &&
    rec["phone_normalized"] !== null &&
    !PHONE_RE.test(rec["phone_normalized"])
  ) {
    errors.push(`phone_normalized is not 10 digits: ${rec["phone_normalized"]}`);
  }
  const source = rec["source"] as Record<string, unknown> | undefined;
  if (source !== undefined && source !== null) {
    if (
      typeof source["sha256_checksum"] !== "string" ||
      !CHECKSUM_RE.test(source["sha256_checksum"])
    ) {
      errors.push("source.sha256_checksum is not 64 lowercase hex chars");
    }
    if (
      typeof source["file_name"] !== "string" ||
      source["file_name"] === ""
    ) {
      errors.push("source.file_name is required");
    }
    if (
      source["file_date"] !== null &&
      source["file_date"] !== undefined &&
      !isIsoDate(source["file_date"] as string)
    ) {
      errors.push(`source.file_date is not an ISO date: ${source["file_date"]}`);
    }
  }
  return errors;
}

export function assertValidRecord(record: NormalizedRecord): void {
  const errors = validateRecord(record);
  if (errors.length > 0) {
    throw new Error(
      `invalid normalized record ${record.source_code}/${record.license_type}/${record.license_number}: ${errors.join("; ")}`,
    );
  }
}
