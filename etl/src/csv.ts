// CSV parser — zero dependencies.
// Handles: UTF-8 BOM, CRLF, quoted fields containing commas / newlines / doubled
// quotes, unquoted fields. Returns the header row plus verbatim rows
// (header name -> raw cell string, untrimmed values preserved).

export interface ParsedCsv {
  errors: Array<{ row: number; reason: string }>;
  header: string[];
  rows: Array<Record<string, string>>;
}

export function parseCsv(text: string): ParsedCsv {
  const errors: Array<{ row: number; reason: string }> = [];
  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ",") {
      record.push(field);
      field = "";
      i += 1;
    } else if (ch === "\r") {
      // CRLF or lone CR ends the record.
      if (text[i + 1] === "\n") i += 1;
      record.push(field);
      field = "";
      records.push(record);
      record = [];
      i += 1;
    } else if (ch === "\n") {
      record.push(field);
      field = "";
      records.push(record);
      record = [];
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  // Trailing record without a line terminator.
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  // Drop wholly-empty trailing records (e.g. a final blank line).
  while (
    records.length > 0 &&
    records[records.length - 1].every((c) => c === "")
  ) {
    records.pop();
  }
  if (records.length === 0) {
    return { errors: [{ row: 0, reason: "empty file: no header row" }], header: [], rows: [] };
  }
  const header = records[0].map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];
  for (let r = 1; r < records.length; r++) {
    const cells = records[r];
    if (cells.length === 1 && cells[0].trim() === "") {
      errors.push({ row: r + 1, reason: "blank line" });
      continue;
    }
    if (cells.length !== header.length) {
      errors.push({
        row: r + 1,
        reason: `wrong column count: got ${cells.length}, expected ${header.length}`,
      });
      continue;
    }
    const row: Record<string, string> = {};
    for (let c = 0; c < header.length; c++) row[header[c]] = cells[c];
    rows.push(row);
  }
  return { errors, header, rows };
}

// Validate the header row against the expected columns for a source.
// A missing REQUIRED column is a HARD failure (stop before loading).
// Unknown EXTRA columns are ignored (logged), never fatal.
export function validateHeader(
  actual: string[],
  required: string[],
): { missing: string[]; extra: string[] } {
  const actualSet = new Set(actual);
  const requiredSet = new Set(required);
  return {
    missing: required.filter((h) => !actualSet.has(h)),
    extra: actual.filter((h) => !requiredSet.has(h)),
  };
}
