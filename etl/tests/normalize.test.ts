// Tests: normalization (Stage 3) — the status/verification split (US2),
// date handling, phone/name normalization, empty -> NULL (I2).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeName,
  normalizePhone,
  normalizeRow,
  parseCityStateZip,
  parseUsDate,
  type NormalizeContext,
} from "../src/normalize.ts";

function tdlrCtx(overrides: Partial<NormalizeContext> = {}): NormalizeContext {
  return {
    asOfDate: "2026-11-24",
    fileDate: "2026-11-24",
    fileName: "Lteecele.csv",
    sha256: "0".repeat(64),
    sourceCode: "tdlr-electrical",
    sourceUrl: "https://www.tdlr.texas.gov/dbproduction2/Lteecele.csv",
    trade: "electrical",
    ...overrides,
  };
}

function rmpCtx(): NormalizeContext {
  return {
    asOfDate: "2026-11-25",
    fileDate: null,
    fileName: "rmp_download",
    sha256: "1".repeat(64),
    sourceCode: "tsbpe-rmp",
    sourceUrl: "https://tsbpe.texas.gov/download-csv/RMP/",
    trade: "plumbing",
  };
}

function tdlrRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "LICENSE TYPE": "Electrical Contractor",
    "LICENSE NUMBER": "99901",
    "LICENSE EXPIRATION DATE": " 07/31/2027",
    COUNTY: "TRAVIS",
    NAME: "SMITH ELECTRICAL SERVICE",
    "BUSINESS NAME": "SMITH ELECTRICAL SERVICE",
    "BUSINESS ADDRESS-LINE1": "100 Main St",
    "BUSINESS ADDRESS-LINE2": "",
    "BUSINESS CITY, STATE ZIP": "AUSTIN TX 78701",
    "BUSINESS COUNTY CODE": "0227",
    "BUSINESS COUNTY": "TRAVIS",
    "BUSINESS ZIP": "78701",
    "BUSINESS PHONE": "5125550100",
    "LICENSE SUBTYPE": "EC",
    ...overrides,
  };
}

function rmpRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    RANK: "M",
    LICENSE_NBR: "99902",
    LIC_STATUS: "Current",
    LICENSE_DATE: "12/21/2011",
    EXPIRATION_DTE: "04/30/2027",
    LAST_NAME: "SMITH",
    FIRST_NAME: "JOHN",
    MIDDLE_NAME: "JAMES",
    SUFFIX: "",
    ADDR1: "100 Main St",
    ADDR2: "",
    ADDR3: "",
    CITY: "AUSTIN",
    STATE: "TX",
    ZIP: "78701",
    PHONE: "5125550100",
    COUNTY: "TRAVIS",
    MEDGAS_ENDR: "Yes",
    MRF_ENDR: "No",
    WS_ENDR: "No",
    INS_EXPIRY_DTE: "02/24/2025",
    PLUMB_COMPANY: "SMITH PLUMBING LLC",
    INSURANCE_COMPANY: "ACME INSURANCE",
    AGENT_PHONE: "5125559999",
    ...overrides,
  };
}

describe("parseUsDate", () => {
  it("trims the TDLR leading space and converts to ISO", () => {
    assert.equal(parseUsDate(" 07/31/2027"), "2027-07-31");
  });
  it("returns null for an empty cell", () => {
    assert.equal(parseUsDate(""), null);
    assert.equal(parseUsDate("   "), null);
  });
  it("returns null for an unparseable date, never a guessed date", () => {
    assert.equal(parseUsDate("not-a-date"), null);
    assert.equal(parseUsDate("02/30/2027"), null);
    assert.equal(parseUsDate("13/01/2027"), null);
  });
});

describe("normalizePhone / normalizeName", () => {
  it("reduces a phone to 10 digits, dropping a leading 1", () => {
    assert.equal(normalizePhone("(512) 555-0100"), "5125550100");
    assert.equal(normalizePhone("1-512-555-0100"), "5125550100");
    assert.equal(normalizePhone("5125550199"), "5125550199");
  });
  it("returns null for an unparseable phone", () => {
    assert.equal(normalizePhone(""), null);
    assert.equal(normalizePhone("123"), null);
    assert.equal(normalizePhone(null), null);
  });
  it("normalizes names deterministically", () => {
    assert.equal(normalizeName("SMITH PLUMBING, LLC"), "smith plumbing llc");
    assert.equal(normalizeName("  A  &  B  "), "a b");
    assert.equal(normalizeName(null), null);
  });
});

describe("parseCityStateZip", () => {
  it("splits a TDLR city/state/ZIP cell", () => {
    assert.deepEqual(parseCityStateZip("HOUSTON TX 77031-2516"), {
      city: "HOUSTON",
      state: "TX",
      zip: "77031-2516",
    });
  });
  it("handles a multi-word city", () => {
    assert.deepEqual(parseCityStateZip("SAN ANTONIO TX 78201"), {
      city: "SAN ANTONIO",
      state: "TX",
      zip: "78201",
    });
  });
  it("returns nulls for an empty cell", () => {
    assert.deepEqual(parseCityStateZip(""), { city: null, state: null, zip: null });
  });
});

describe("normalizeRow — TDLR (no status field)", () => {
  it("derives active + inferred from a future expiration date", () => {
    const rec = normalizeRow(tdlrRow(), tdlrCtx(), 2);
    assert.equal(rec.license_status, "active");
    assert.equal(rec.license_status_source, "expiration_date");
    assert.equal(rec.verification_level, "inferred");
    assert.equal(rec.expiration_date, "2027-07-31");
    assert.equal(rec.contract_version, "v1");
    assert.equal(rec.status_as_of, "2026-11-24");
  });

  it("derives expired + inferred from a past expiration date", () => {
    const rec = normalizeRow(
      tdlrRow({ "LICENSE EXPIRATION DATE": " 01/31/2025" }),
      tdlrCtx(),
      2,
    );
    assert.equal(rec.license_status, "expired");
    assert.equal(rec.verification_level, "inferred");
  });

  it("keeps empty business phone/address as NULL, never substitutes the mailing phone", () => {
    const rec = normalizeRow(
      tdlrRow({
        "BUSINESS PHONE": "",
        "BUSINESS ADDRESS-LINE1": "",
        "BUSINESS CITY, STATE ZIP": "",
      }),
      tdlrCtx(),
      2,
    );
    assert.equal(rec.phone, null);
    assert.equal(rec.phone_normalized, null);
    assert.equal(rec.address?.line1, null);
    assert.equal(rec.address?.city, null);
  });

  it("keeps an empty business name NULL (fallback is a load-time rule)", () => {
    const rec = normalizeRow(tdlrRow({ "BUSINESS NAME": "" }), tdlrCtx(), 2);
    assert.equal(rec.business_name, null);
    assert.equal(rec.business_name_normalized, null);
    assert.equal(rec.holder?.full_name, "SMITH ELECTRICAL SERVICE");
  });

  it("throws a parse error (never a fabricated number) for a missing license number", () => {
    assert.throws(
      () => normalizeRow(tdlrRow({ "LICENSE NUMBER": "" }), tdlrCtx(), 42),
      /missing license number/,
    );
  });

  it("marks an unparseable expiration date unverified + unknown", () => {
    const rec = normalizeRow(
      tdlrRow({ "LICENSE EXPIRATION DATE": "garbage" }),
      tdlrCtx(),
      2,
    );
    assert.equal(rec.expiration_date, null);
    assert.equal(rec.license_status, "unknown");
    assert.equal(rec.verification_level, "unverified");
  });
});

describe("normalizeRow — TSBPE RMP (has a status field)", () => {
  it("maps Current -> active + authority-confirmed (status value only)", () => {
    const rec = normalizeRow(rmpRow(), rmpCtx(), 2);
    assert.equal(rec.license_status, "active");
    assert.equal(rec.license_status_source, "source_field");
    assert.equal(rec.verification_level, "authority-confirmed");
    assert.equal(rec.license_type, "Responsible Master Plumber");
    assert.equal(rec.issue_date, "2011-12-21");
    assert.deepEqual(rec.endorsements, ["MEDGAS"]);
    assert.equal(rec.insurance?.company, "ACME INSURANCE");
    assert.equal(rec.holder?.full_name, "JOHN JAMES SMITH");
  });

  it("maps Expired -> expired + authority-confirmed", () => {
    const rec = normalizeRow(rmpRow({ LIC_STATUS: "Expired" }), rmpCtx(), 2);
    assert.equal(rec.license_status, "expired");
    assert.equal(rec.verification_level, "authority-confirmed");
  });

  it("maps an unknown source status to unknown + unverified", () => {
    const rec = normalizeRow(rmpRow({ LIC_STATUS: "Suspended" }), rmpCtx(), 2);
    assert.equal(rec.license_status, "unknown");
    assert.equal(rec.verification_level, "unverified");
  });

  it("never maps the insurance agent phone to the business phone", () => {
    const rec = normalizeRow(rmpRow({ PHONE: "" }), rmpCtx(), 2);
    assert.equal(rec.phone, null);
    assert.notEqual(rec.phone_normalized, "5125559999");
  });
});
