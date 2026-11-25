// Tests: CSV parsing (Stage 2) — BOM, CRLF, quoted commas/newlines,
// leading spaces preserved verbatim, wrong column counts reported.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, validateHeader } from "../src/csv.ts";

describe("parseCsv", () => {
  it("parses a plain header + rows", () => {
    const out = parseCsv("A,B,C\n1,2,3\n4,5,6\n");
    assert.equal(out.header.join(","), "A,B,C");
    assert.equal(out.rows.length, 2);
    assert.equal(out.rows[0]["B"], "2");
    assert.deepEqual(out.errors, []);
  });

  it("strips a UTF-8 BOM", () => {
    const out = parseCsv("\uFEFFA,B\n1,2\n");
    assert.equal(out.header[0], "A");
  });

  it("handles CRLF and quoted fields with commas", () => {
    const out = parseCsv('"A","B"\r\n"x, y","2"\r\n');
    assert.equal(out.rows[0]["A"], "x, y");
    assert.equal(out.rows.length, 1);
  });

  it("handles quoted fields with embedded newlines and doubled quotes", () => {
    const out = parseCsv('A,B\n"line1\nline2","say ""hi"""\n');
    assert.equal(out.rows[0]["A"], "line1\nline2");
    assert.equal(out.rows[0]["B"], 'say "hi"');
  });

  it("preserves leading spaces in values verbatim (TDLR dates)", () => {
    const out = parseCsv("LICENSE EXPIRATION DATE\n 07/31/2027\n");
    assert.equal(out.rows[0]["LICENSE EXPIRATION DATE"], " 07/31/2027");
  });

  it("reports a wrong column count as a parse error, never loads the row", () => {
    const out = parseCsv("A,B\n1\n2,3\n");
    assert.equal(out.rows.length, 1);
    assert.equal(out.errors.length, 1);
    assert.match(out.errors[0].reason, /wrong column count/);
  });

  it("reports an empty file", () => {
    const out = parseCsv("");
    assert.equal(out.errors.length, 1);
    assert.equal(out.rows.length, 0);
  });
});

describe("validateHeader", () => {
  it("flags a missing required column, ignores unknown extras", () => {
    const { missing, extra } = validateHeader(
      ["A", "B", "SURPRISE"],
      ["A", "B", "C"],
    );
    assert.deepEqual(missing, ["C"]);
    assert.deepEqual(extra, ["SURPRISE"]);
  });

  it("passes when all required columns are present", () => {
    const { missing } = validateHeader(["A", "B", "C"], ["A", "B"]);
    assert.deepEqual(missing, []);
  });
});
