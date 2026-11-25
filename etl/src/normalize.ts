// Normalization — pure functions of (row, source config, file date).
// No network, no DB, no global state. Implements the field mapping in
// docs/architecture/data-contract.md §2 and the invariants I1–I4.
// Output conforms to etl/contract/normalized-record.v1.json.

export interface NormalizedAddress {
  city: string | null;
  county: string | null;
  county_code: string | null;
  line1: string | null;
  line2: string | null;
  state: string | null;
  zip: string | null;
}

export interface NormalizedHolder {
  first_name: string | null;
  full_name: string;
  last_name: string | null;
  middle_name: string | null;
  suffix: string | null;
}

export interface NormalizedRecord {
  address: NormalizedAddress | null;
  business_name: string | null;
  business_name_normalized: string | null;
  contract_version: string;
  endorsements: string[];
  expiration_date: string | null;
  holder: NormalizedHolder | null;
  insurance: { company: string | null; expiry_date: string | null } | null;
  issue_date: string | null;
  license_number: string;
  license_status: string;
  license_status_source: string;
  license_subtype: string | null;
  license_type: string;
  phone: string | null;
  phone_normalized: string | null;
  source: {
    file_date: string | null;
    file_name: string;
    sha256_checksum: string;
    source_url: string | null;
  };
  source_code: string;
  status_as_of: string;
  trade: string;
  verification_level: string;
}

export interface NormalizeContext {
  asOfDate: string; // YYYY-MM-DD: file date when known, else run date
  fileDate: string | null;
  fileName: string;
  sha256: string;
  sourceCode: string;
  sourceUrl: string | null;
  trade: string;
}

export class NormalizeError extends Error {
  rowNumber: number;
  constructor(rowNumber: number, message: string) {
    super(message);
    this.rowNumber = rowNumber;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// "MM/DD/YYYY" (possibly with a leading space, as TDLR ships it) -> "YYYY-MM-DD".
// Returns null when the cell is empty or unparseable (never a guessed date, I4).
export function parseUsDate(value: string | undefined | null): string | null {
  const s = emptyToNull(value);
  if (s === null) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject impossible calendar dates (e.g. 02/30/2027) by round-tripping.
  const d = new Date(`${iso}T00:00:00Z`);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return iso;
}

// Lowercase, strip punctuation, collapse whitespace — deterministic (N4).
export function normalizeName(value: string | null): string | null {
  if (value === null) return null;
  const out = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out === "" ? null : out;
}

// 10 US digits: strip formatting, drop a leading "1" country code (N5).
export function normalizePhone(value: string | null): string | null {
  if (value === null) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return null;
}

// "HOUSTON TX 77031-2516" -> { city: "HOUSTON", state: "TX", zip: "77031-2516" }.
// Returns all-nulls when the cell is empty or does not match the pattern.
export function parseCityStateZip(
  value: string | undefined | null,
): { city: string | null; state: string | null; zip: string | null } {
  const s = emptyToNull(value);
  if (s === null) return { city: null, state: null, zip: null };
  const m = /^(.*)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/.exec(s);
  if (!m) return { city: null, state: null, zip: null };
  const city = m[1].trim();
  return { city: city === "" ? null : city, state: m[2], zip: m[3] };
}

// Normalized address key used as dedupe evidence (Dd1): line1 + city + ZIP.
export function normalizeAddressKey(address: NormalizedAddress | null): string | null {
  if (address === null) return null;
  if (address.line1 === null) return null;
  const parts = [
    normalizeName(address.line1),
    normalizeName(address.city),
    address.zip === null ? null : address.zip.replace(/\D/g, "").slice(0, 5),
  ];
  if (parts[0] === null) return null;
  return parts.map((p) => p ?? "").join("|");
}

function baseRecord(
  ctx: NormalizeContext,
  fields: Omit<
    NormalizedRecord,
    "address" | "contract_version" | "source" | "status_as_of"
  > & { address: NormalizedAddress | null },
): NormalizedRecord {
  return {
    address: fields.address,
    business_name: fields.business_name,
    business_name_normalized: fields.business_name_normalized,
    contract_version: "v1",
    endorsements: fields.endorsements,
    expiration_date: fields.expiration_date,
    holder: fields.holder,
    insurance: fields.insurance,
    issue_date: fields.issue_date,
    license_number: fields.license_number,
    license_status: fields.license_status,
    license_status_source: fields.license_status_source,
    license_subtype: fields.license_subtype,
    license_type: fields.license_type,
    phone: fields.phone,
    phone_normalized: fields.phone_normalized,
    source: {
      file_date: ctx.fileDate,
      file_name: ctx.fileName,
      sha256_checksum: ctx.sha256,
      source_url: ctx.sourceUrl,
    },
    source_code: ctx.sourceCode,
    status_as_of: ctx.asOfDate,
    trade: ctx.trade,
    verification_level: fields.verification_level,
  };
}

// TDLR adapter (electrical + HVAC). The file has NO status field:
// status is derived from the expiration date and verification is ALWAYS
// 'inferred' (I1). Empty business name/phone/address stay NULL (I2).
export function normalizeTdlr(
  row: Record<string, string>,
  ctx: NormalizeContext,
  rowNumber: number,
): NormalizedRecord {
  const licenseNumber = emptyToNull(row["LICENSE NUMBER"]);
  if (licenseNumber === null) {
    throw new NormalizeError(rowNumber, "missing license number");
  }
  const expirationRaw = row["LICENSE EXPIRATION DATE"];
  const expirationDate = parseUsDate(expirationRaw);
  const dateUnparseable =
    emptyToNull(expirationRaw) !== null && expirationDate === null;
  let licenseStatus: string;
  let verificationLevel: string;
  if (expirationDate === null) {
    licenseStatus = "unknown";
    verificationLevel = "unverified";
  } else if (expirationDate >= ctx.asOfDate) {
    licenseStatus = "active";
    verificationLevel = "inferred";
  } else {
    licenseStatus = "expired";
    verificationLevel = "inferred";
  }
  if (dateUnparseable) verificationLevel = "unverified";
  const csz = parseCityStateZip(row["BUSINESS CITY, STATE ZIP"]);
  const businessName = emptyToNull(row["BUSINESS NAME"]);
  const holderName = emptyToNull(row["NAME"]);
  const phone = emptyToNull(row["BUSINESS PHONE"]);
  return baseRecord(ctx, {
    address: {
      city: csz.city,
      county: emptyToNull(row["BUSINESS COUNTY"]),
      county_code: emptyToNull(row["BUSINESS COUNTY CODE"]),
      line1: emptyToNull(row["BUSINESS ADDRESS-LINE1"]),
      line2: emptyToNull(row["BUSINESS ADDRESS-LINE2"]),
      state: csz.state,
      zip: emptyToNull(row["BUSINESS ZIP"]) ?? csz.zip,
    },
    business_name: businessName,
    business_name_normalized: normalizeName(businessName),
    endorsements: [],
    expiration_date: expirationDate,
    holder:
      holderName === null
        ? null
        : {
            first_name: null,
            full_name: holderName,
            last_name: null,
            middle_name: null,
            suffix: null,
          },
    insurance: null,
    issue_date: null,
    license_number: licenseNumber,
    license_status: licenseStatus,
    license_status_source: "expiration_date",
    license_subtype: emptyToNull(row["LICENSE SUBTYPE"]),
    license_type: emptyToNull(row["LICENSE TYPE"]) ?? "",
    phone,
    phone_normalized: normalizePhone(phone),
    verification_level: verificationLevel,
  });
}

// TSBPE RMP adapter. The file HAS a status field (LIC_STATUS):
// status reflects it and verification may be 'authority-confirmed' —
// for the status value itself only, never for the business identity (US2).
export function normalizeRmp(
  row: Record<string, string>,
  ctx: NormalizeContext,
  rowNumber: number,
): NormalizedRecord {
  const licenseNumber = emptyToNull(row["LICENSE_NBR"]);
  if (licenseNumber === null) {
    throw new NormalizeError(rowNumber, "missing license number");
  }
  const rawStatus = emptyToNull(row["LIC_STATUS"]);
  let licenseStatus: string;
  let verificationLevel: string;
  if (rawStatus === "Current") {
    licenseStatus = "active";
    verificationLevel = "authority-confirmed";
  } else if (rawStatus === "Expired") {
    licenseStatus = "expired";
    verificationLevel = "authority-confirmed";
  } else {
    licenseStatus = "unknown";
    verificationLevel = "unverified";
  }
  const expirationDate = parseUsDate(row["EXPIRATION_DTE"]);
  const issueDate = parseUsDate(row["LICENSE_DATE"]);
  const firstName = emptyToNull(row["FIRST_NAME"]);
  const middleName = emptyToNull(row["MIDDLE_NAME"]);
  const lastName = emptyToNull(row["LAST_NAME"]);
  const suffix = emptyToNull(row["SUFFIX"]);
  const holderFull = [firstName, middleName, lastName, suffix]
    .filter((p) => p !== null)
    .join(" ");
  const endorsements: string[] = [];
  if (emptyToNull(row["MEDGAS_ENDR"]) === "Yes") endorsements.push("MEDGAS");
  if (emptyToNull(row["MRF_ENDR"]) === "Yes") endorsements.push("MRF");
  if (emptyToNull(row["WS_ENDR"]) === "Yes") endorsements.push("WS");
  const businessName = emptyToNull(row["PLUMB_COMPANY"]);
  const phone = emptyToNull(row["PHONE"]);
  const insuranceCompany = emptyToNull(row["INSURANCE_COMPANY"]);
  const insuranceExpiry = parseUsDate(row["INS_EXPIRY_DTE"]);
  return baseRecord(ctx, {
    address: {
      city: emptyToNull(row["CITY"]),
      county: emptyToNull(row["COUNTY"]),
      county_code: null,
      line1: emptyToNull(row["ADDR1"]),
      line2: emptyToNull(row["ADDR2"]),
      state: emptyToNull(row["STATE"]),
      zip: emptyToNull(row["ZIP"]),
    },
    business_name: businessName,
    business_name_normalized: normalizeName(businessName),
    endorsements,
    expiration_date: expirationDate,
    holder:
      holderFull === ""
        ? null
        : {
            first_name: firstName,
            full_name: holderFull,
            last_name: lastName,
            middle_name: middleName,
            suffix,
          },
    insurance:
      insuranceCompany === null && insuranceExpiry === null
        ? null
        : { company: insuranceCompany, expiry_date: insuranceExpiry },
    issue_date: issueDate,
    license_number: licenseNumber,
    license_status: licenseStatus,
    license_status_source: "source_field",
    license_subtype: null,
    license_type: "Responsible Master Plumber",
    phone,
    phone_normalized: normalizePhone(phone),
    verification_level: verificationLevel,
  });
}

export function normalizeRow(
  row: Record<string, string>,
  ctx: NormalizeContext,
  rowNumber: number,
): NormalizedRecord {
  if (ctx.sourceCode === "tsbpe-rmp") return normalizeRmp(row, ctx, rowNumber);
  return normalizeTdlr(row, ctx, rowNumber);
}
