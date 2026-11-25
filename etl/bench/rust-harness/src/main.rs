// House Craft Pros — Rust benchmark harness (NON-PRODUCTION).
//
// This is a BENCHMARK ONLY. It is not in the production run path, it never
// writes to the database, and it must never be mistaken for a second ETL
// engine: the one production engine is TypeScript (etl/src/). Its only job
// is to run the SAME parse + normalize + dedupe workload as the TypeScript
// bench driver (etl/bench/ts-bench.ts) over the SAME CSV files, so the two
// sides can be compared on time, CPU, RAM and output accuracy under
// BENCHMARK PARITY (same files by SHA-256, same machine, same rules, same
// output schema). See docs/architecture/rust-readiness.md.
//
// Zero external crates (std only) so the build needs no network.
// Usage:
//   cargo build --release
//   ./target/release/hcp-bench --staging /tmp/hcp-etl --out bench/out/rs

use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::Instant;

// ---------------------------------------------------------------------------
// SHA-256 (FIPS 180-4), std-only. Verified against `sha256sum` in tests.
// ---------------------------------------------------------------------------
const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

fn sha256_hex(data: &[u8]) -> String {
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let mut msg = data.to_vec();
    let bitlen = (data.len() as u64) * 8;
    msg.push(0x80);
    while (msg.len() % 64) != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bitlen.to_be_bytes());
    for chunk in msg.chunks_exact(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([chunk[4 * i], chunk[4 * i + 1], chunk[4 * i + 2], chunk[4 * i + 3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = String::with_capacity(64);
    for word in h {
        out.push_str(&format!("{:08x}", word));
    }
    out
}

// ---------------------------------------------------------------------------
// JSON escaping that matches JSON.stringify for the characters we emit.
// ---------------------------------------------------------------------------
fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn json_opt(v: &Option<String>) -> String {
    match v {
        Some(s) => json_escape(s),
        None => "null".to_string(),
    }
}

// ---------------------------------------------------------------------------
// CSV parsing — same semantics as etl/src/csv.ts.
// ---------------------------------------------------------------------------
fn parse_csv(text: &str) -> (Vec<String>, Vec<HashMap<String, String>>, Vec<String>) {
    let text = text.strip_prefix('\u{feff}').unwrap_or(text);
    let mut records: Vec<Vec<String>> = Vec::new();
    let mut field = String::new();
    let mut record: Vec<String> = Vec::new();
    let mut in_quotes = false;
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if in_quotes {
            if ch == '"' {
                if i + 1 < chars.len() && chars[i + 1] == '"' {
                    field.push('"');
                    i += 2;
                } else {
                    in_quotes = false;
                    i += 1;
                }
            } else {
                field.push(ch);
                i += 1;
            }
        } else if ch == '"' {
            in_quotes = true;
            i += 1;
        } else if ch == ',' {
            record.push(std::mem::take(&mut field));
            i += 1;
        } else if ch == '\r' {
            if i + 1 < chars.len() && chars[i + 1] == '\n' {
                i += 1;
            }
            record.push(std::mem::take(&mut field));
            records.push(std::mem::take(&mut record));
            i += 1;
        } else if ch == '\n' {
            record.push(std::mem::take(&mut field));
            records.push(std::mem::take(&mut record));
            i += 1;
        } else {
            field.push(ch);
            i += 1;
        }
    }
    if !field.is_empty() || !record.is_empty() {
        record.push(field);
        records.push(record);
    }
    while let Some(last) = records.last() {
        if last.iter().all(|c| c.is_empty()) {
            records.pop();
        } else {
            break;
        }
    }
    let mut errors: Vec<String> = Vec::new();
    if records.is_empty() {
        errors.push("empty file: no header row".to_string());
        return (Vec::new(), Vec::new(), errors);
    }
    let header: Vec<String> = records[0].iter().map(|h| h.trim().to_string()).collect();
    let mut rows: Vec<HashMap<String, String>> = Vec::new();
    for (r, cells) in records.iter().enumerate().skip(1) {
        if cells.len() == 1 && cells[0].trim().is_empty() {
            errors.push(format!("row {}: blank line", r + 1));
            continue;
        }
        if cells.len() != header.len() {
            errors.push(format!(
                "row {}: wrong column count: got {}, expected {}",
                r + 1,
                cells.len(),
                header.len()
            ));
            continue;
        }
        let mut row: HashMap<String, String> = HashMap::new();
        for (c, h) in header.iter().enumerate() {
            row.insert(h.clone(), cells[c].clone());
        }
        rows.push(row);
    }
    (header, rows, errors)
}

// ---------------------------------------------------------------------------
// Normalization helpers — mirrors etl/src/normalize.ts exactly.
// ---------------------------------------------------------------------------
fn empty_to_null(v: Option<&String>) -> Option<String> {
    match v {
        Some(s) => {
            let t = s.trim();
            if t.is_empty() {
                None
            } else {
                Some(t.to_string())
            }
        }
        None => None,
    }
}

fn days_in_month(year: i64, month: i64) -> i64 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || year % 400 == 0 {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

fn parse_us_date(v: Option<&String>) -> Option<String> {
    let s = empty_to_null(v)?;
    let parts: Vec<&str> = s.split('/').collect();
    if parts.len() != 3 {
        return None;
    }
    let month: i64 = parts[0].parse().ok()?;
    let day: i64 = parts[1].parse().ok()?;
    let year: i64 = parts[2].parse().ok()?;
    if parts[2].len() != 4 || month < 1 || month > 12 || day < 1 || day > days_in_month(year, month) {
        return None;
    }
    Some(format!("{:04}-{:02}-{:02}", year, month, day))
}

fn normalize_name(v: &Option<String>) -> Option<String> {
    let s = v.as_ref()?;
    let mut out = String::new();
    for ch in s.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch.to_ascii_lowercase());
        } else if ch.is_whitespace() {
            out.push(' ');
        } else {
            out.push(' ');
        }
    }
    let collapsed = out.split_whitespace().collect::<Vec<&str>>().join(" ");
    if collapsed.is_empty() {
        None
    } else {
        Some(collapsed)
    }
}

fn normalize_phone(v: &Option<String>) -> Option<String> {
    let s = v.as_ref()?;
    let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 11 && digits.starts_with('1') {
        return Some(digits[1..].to_string());
    }
    if digits.len() == 10 {
        return Some(digits);
    }
    None
}

fn parse_city_state_zip(v: Option<&String>) -> (Option<String>, Option<String>, Option<String>) {
    let s = match empty_to_null(v) {
        Some(s) => s,
        None => return (None, None, None),
    };
    // Last token: ZIP (5 digits, optional -4). Token before it: 2-letter state.
    // The city is everything before the state token, verbatim except for
    // trimming (the source spelling is preserved, including double spaces).
    let tokens: Vec<&str> = s.split_whitespace().collect();
    if tokens.len() < 3 {
        return (None, None, None);
    }
    let zip = tokens[tokens.len() - 1];
    let zip_ok = zip.len() == 5 && zip.chars().all(|c| c.is_ascii_digit())
        || zip.len() == 10
            && zip.chars().take(5).all(|c| c.is_ascii_digit())
            && zip.chars().nth(5) == Some('-')
            && zip.chars().skip(6).all(|c| c.is_ascii_digit());
    if !zip_ok {
        return (None, None, None);
    }
    let state = tokens[tokens.len() - 2];
    if state.len() != 2 || !state.chars().all(|c| c.is_ascii_uppercase()) {
        return (None, None, None);
    }
    // Byte position of the state token: the last occurrence of " {state} {zip}".
    let suffix = format!(" {} {}", state, zip);
    let city_end = match s.rfind(&suffix) {
        Some(pos) => pos,
        None => return (None, None, None),
    };
    let city = s[..city_end].trim().to_string();
    (
        if city.is_empty() { None } else { Some(city) },
        Some(state.to_string()),
        Some(zip.to_string()),
    )
}

#[derive(Clone, Debug)]
struct Address {
    city: Option<String>,
    county: Option<String>,
    county_code: Option<String>,
    line1: Option<String>,
    line2: Option<String>,
    state: Option<String>,
    zip: Option<String>,
}

fn address_key(a: &Address) -> Option<String> {
    let line1 = a.line1.as_ref()?;
    let norm_line1 = normalize_name(&Some(line1.clone()))?;
    let norm_city = normalize_name(&a.city);
    let zip5: String = match &a.zip {
        Some(z) => z.chars().filter(|c| c.is_ascii_digit()).take(5).collect(),
        None => String::new(),
    };
    Some(format!(
        "{}|{}|{}",
        norm_line1,
        norm_city.unwrap_or_default(),
        zip5
    ))
}

#[derive(Clone, Debug)]
struct Holder {
    first_name: Option<String>,
    full_name: String,
    last_name: Option<String>,
    middle_name: Option<String>,
    suffix: Option<String>,
}

#[derive(Clone, Debug)]
struct Record {
    address: Address,
    business_name: Option<String>,
    business_name_normalized: Option<String>,
    contract_version: String,
    endorsements: Vec<String>,
    expiration_date: Option<String>,
    holder: Option<Holder>,
    insurance_company: Option<String>,
    insurance_expiry_date: Option<String>,
    issue_date: Option<String>,
    license_number: String,
    license_status: String,
    license_status_source: String,
    license_subtype: Option<String>,
    license_type: String,
    phone: Option<String>,
    phone_normalized: Option<String>,
    source_file_date: Option<String>,
    source_file_name: String,
    source_sha256: String,
    source_url: Option<String>,
    source_code: String,
    status_as_of: String,
    trade: String,
    verification_level: String,
}

impl Record {
    fn identity(&self) -> String {
        format!("{}|{}|{}", self.source_code, self.license_type, self.license_number)
    }

    fn to_canonical_json(&self) -> String {
        let addr = format!(
            "{{\"city\":{},\"county\":{},\"county_code\":{},\"line1\":{},\"line2\":{},\"state\":{},\"zip\":{}}}",
            json_opt(&self.address.city),
            json_opt(&self.address.county),
            json_opt(&self.address.county_code),
            json_opt(&self.address.line1),
            json_opt(&self.address.line2),
            json_opt(&self.address.state),
            json_opt(&self.address.zip),
        );
        let holder = match &self.holder {
            Some(h) => format!(
                "{{\"first_name\":{},\"full_name\":{},\"last_name\":{},\"middle_name\":{},\"suffix\":{}}}",
                json_opt(&h.first_name),
                json_escape(&h.full_name),
                json_opt(&h.last_name),
                json_opt(&h.middle_name),
                json_opt(&h.suffix),
            ),
            None => "null".to_string(),
        };
        let insurance = match (&self.insurance_company, &self.insurance_expiry_date) {
            (None, None) => "null".to_string(),
            (c, e) => format!(
                "{{\"company\":{},\"expiry_date\":{}}}",
                json_opt(c),
                json_opt(e)
            ),
        };
        let endorsements = format!(
            "[{}]",
            self.endorsements
                .iter()
                .map(|e| json_escape(e))
                .collect::<Vec<String>>()
                .join(",")
        );
        format!(
            "{{\"address\":{},\"business_name\":{},\"business_name_normalized\":{},\"contract_version\":{},\"endorsements\":{},\"expiration_date\":{},\"holder\":{},\"insurance\":{},\"issue_date\":{},\"license_number\":{},\"license_status\":{},\"license_status_source\":{},\"license_subtype\":{},\"license_type\":{},\"phone\":{},\"phone_normalized\":{},\"source\":{{\"file_date\":{},\"file_name\":{},\"sha256_checksum\":{},\"source_url\":{}}},\"source_code\":{},\"status_as_of\":{},\"trade\":{},\"verification_level\":{}}}",
            addr,
            json_opt(&self.business_name),
            json_opt(&self.business_name_normalized),
            json_escape(&self.contract_version),
            endorsements,
            json_opt(&self.expiration_date),
            holder,
            insurance,
            json_opt(&self.issue_date),
            json_escape(&self.license_number),
            json_escape(&self.license_status),
            json_escape(&self.license_status_source),
            json_opt(&self.license_subtype),
            json_escape(&self.license_type),
            json_opt(&self.phone),
            json_opt(&self.phone_normalized),
            json_opt(&self.source_file_date),
            json_escape(&self.source_file_name),
            json_escape(&self.source_sha256),
            json_opt(&self.source_url),
            json_escape(&self.source_code),
            json_escape(&self.status_as_of),
            json_escape(&self.trade),
            json_escape(&self.verification_level),
        )
    }
}

struct Ctx {
    as_of_date: String,
    file_date: Option<String>,
    file_name: String,
    sha256: String,
    source_code: String,
    source_url: Option<String>,
    trade: String,
}

fn get(row: &HashMap<String, String>, col: &str) -> Option<String> {
    empty_to_null(row.get(col))
}

fn normalize_tdlr(row: &HashMap<String, String>, ctx: &Ctx) -> Result<Record, String> {
    let license_number = get(row, "LICENSE NUMBER").ok_or("missing license number")?;
    let expiration_raw = row.get("LICENSE EXPIRATION DATE");
    let expiration_date = parse_us_date(expiration_raw);
    let date_unparseable = empty_to_null(expiration_raw).is_some() && expiration_date.is_none();
    let (license_status, mut verification_level) = match &expiration_date {
        None => ("unknown".to_string(), "unverified".to_string()),
        Some(d) if d >= &ctx.as_of_date => ("active".to_string(), "inferred".to_string()),
        Some(_) => ("expired".to_string(), "inferred".to_string()),
    };
    if date_unparseable {
        verification_level = "unverified".to_string();
    }
    let (city, state, csz_zip) = parse_city_state_zip(row.get("BUSINESS CITY, STATE ZIP"));
    let business_name = get(row, "BUSINESS NAME");
    let holder_name = get(row, "NAME");
    let phone = get(row, "BUSINESS PHONE");
    let zip = match get(row, "BUSINESS ZIP") {
        Some(z) => Some(z),
        None => csz_zip,
    };
    Ok(Record {
        address: Address {
            city,
            county: get(row, "BUSINESS COUNTY"),
            county_code: get(row, "BUSINESS COUNTY CODE"),
            line1: get(row, "BUSINESS ADDRESS-LINE1"),
            line2: get(row, "BUSINESS ADDRESS-LINE2"),
            state,
            zip,
        },
        business_name_normalized: normalize_name(&business_name),
        business_name,
        contract_version: "v1".to_string(),
        endorsements: Vec::new(),
        expiration_date,
        holder: holder_name.map(|full_name| Holder {
            first_name: None,
            full_name,
            last_name: None,
            middle_name: None,
            suffix: None,
        }),
        insurance_company: None,
        insurance_expiry_date: None,
        issue_date: None,
        license_number,
        license_status,
        license_status_source: "expiration_date".to_string(),
        license_subtype: get(row, "LICENSE SUBTYPE"),
        license_type: get(row, "LICENSE TYPE").unwrap_or_default(),
        phone_normalized: normalize_phone(&phone),
        phone,
        source_file_date: ctx.file_date.clone(),
        source_file_name: ctx.file_name.clone(),
        source_sha256: ctx.sha256.clone(),
        source_url: ctx.source_url.clone(),
        source_code: ctx.source_code.clone(),
        status_as_of: ctx.as_of_date.clone(),
        trade: ctx.trade.clone(),
        verification_level,
    })
}

fn normalize_rmp(row: &HashMap<String, String>, ctx: &Ctx) -> Result<Record, String> {
    let license_number = get(row, "LICENSE_NBR").ok_or("missing license number")?;
    let raw_status = get(row, "LIC_STATUS");
    let (license_status, verification_level) = match raw_status.as_deref() {
        Some("Current") => ("active".to_string(), "authority-confirmed".to_string()),
        Some("Expired") => ("expired".to_string(), "authority-confirmed".to_string()),
        _ => ("unknown".to_string(), "unverified".to_string()),
    };
    let first_name = get(row, "FIRST_NAME");
    let middle_name = get(row, "MIDDLE_NAME");
    let last_name = get(row, "LAST_NAME");
    let suffix = get(row, "SUFFIX");
    let mut parts: Vec<String> = Vec::new();
    for p in [&first_name, &middle_name, &last_name, &suffix] {
        if let Some(v) = p {
            parts.push(v.clone());
        }
    }
    let holder_full = parts.join(" ");
    let mut endorsements: Vec<String> = Vec::new();
    if get(row, "MEDGAS_ENDR").as_deref() == Some("Yes") {
        endorsements.push("MEDGAS".to_string());
    }
    if get(row, "MRF_ENDR").as_deref() == Some("Yes") {
        endorsements.push("MRF".to_string());
    }
    if get(row, "WS_ENDR").as_deref() == Some("Yes") {
        endorsements.push("WS".to_string());
    }
    let business_name = get(row, "PLUMB_COMPANY");
    let phone = get(row, "PHONE");
    let insurance_company = get(row, "INSURANCE_COMPANY");
    let insurance_expiry_date = parse_us_date(row.get("INS_EXPIRY_DTE"));
    Ok(Record {
        address: Address {
            city: get(row, "CITY"),
            county: get(row, "COUNTY"),
            county_code: None,
            line1: get(row, "ADDR1"),
            line2: get(row, "ADDR2"),
            state: get(row, "STATE"),
            zip: get(row, "ZIP"),
        },
        business_name_normalized: normalize_name(&business_name),
        business_name,
        contract_version: "v1".to_string(),
        endorsements,
        expiration_date: parse_us_date(row.get("EXPIRATION_DTE")),
        holder: if holder_full.is_empty() {
            None
        } else {
            Some(Holder {
                first_name,
                full_name: holder_full,
                last_name,
                middle_name,
                suffix,
            })
        },
        insurance_company,
        insurance_expiry_date,
        issue_date: parse_us_date(row.get("LICENSE_DATE")),
        license_number,
        license_status,
        license_status_source: "source_field".to_string(),
        license_subtype: None,
        license_type: "Responsible Master Plumber".to_string(),
        phone_normalized: normalize_phone(&phone),
        phone,
        source_file_date: ctx.file_date.clone(),
        source_file_name: ctx.file_name.clone(),
        source_sha256: ctx.sha256.clone(),
        source_url: ctx.source_url.clone(),
        source_code: ctx.source_code.clone(),
        status_as_of: ctx.as_of_date.clone(),
        trade: ctx.trade.clone(),
        verification_level,
    })
}

// ---------------------------------------------------------------------------
// Dedupe — mirrors etl/src/dedupe.ts exactly (same evidence rules, same
// rationale strings, same deterministic ordering).
// ---------------------------------------------------------------------------
struct Evidence {
    address_key: Option<String>,
    phone_normalized: Option<String>,
}

fn evidence_of(r: &Record) -> Evidence {
    Evidence {
        address_key: address_key(&r.address),
        phone_normalized: r.phone_normalized.clone(),
    }
}

fn shares_evidence(a: &Evidence, b: &Evidence) -> Option<String> {
    if let (Some(pa), Some(pb)) = (&a.phone_normalized, &b.phone_normalized) {
        if pa == pb {
            return Some(format!("same phone {}", pa));
        }
    }
    if let (Some(ka), Some(kb)) = (&a.address_key, &b.address_key) {
        if ka == kb {
            return Some("same address (line1 + city + ZIP)".to_string());
        }
    }
    None
}

fn conflicts(a: &Evidence, b: &Evidence) -> Option<String> {
    if let (Some(pa), Some(pb)) = (&a.phone_normalized, &b.phone_normalized) {
        if pa != pb {
            return Some("different phones".to_string());
        }
    }
    if let (Some(ka), Some(kb)) = (&a.address_key, &b.address_key) {
        if ka != kb {
            return Some("different addresses".to_string());
        }
    }
    None
}

fn business_fields(r: &Record) -> (String, String, bool) {
    // (normalized_name, display_name, name_fallback)
    let normalized = match &r.business_name_normalized {
        Some(n) => n.clone(),
        None => normalize_name(&r.holder.as_ref().map(|h| h.full_name.clone()))
            .unwrap_or_else(|| "unknown business".to_string()),
    };
    let display = match &r.business_name {
        Some(b) => b.clone(),
        None => match &r.holder {
            Some(h) => h.full_name.clone(),
            None => "UNKNOWN BUSINESS".to_string(),
        },
    };
    (normalized, display, r.business_name.is_none())
}

struct Decision {
    business_key: Option<String>,
    cluster_key: String,
    decision: String,
    license_indexes: Vec<usize>,
    rationale: String,
}

fn dedupe(records: &[Record]) -> (Vec<String>, Vec<String>, Vec<Decision>) {
    // assignments: business key per record; statuses per record.
    let mut assignments: Vec<String> = vec![String::new(); records.len()];
    let mut statuses: Vec<String> = vec!["single".to_string(); records.len()];
    let mut decisions: Vec<Decision> = Vec::new();
    // Group indexes by normalized name, first-appearance order.
    let mut clusters: Vec<(String, Vec<usize>)> = Vec::new();
    for (i, r) in records.iter().enumerate() {
        let (key, _, _) = business_fields(r);
        if let Some(entry) = clusters.iter_mut().find(|(k, _)| *k == key) {
            entry.1.push(i);
        } else {
            clusters.push((key, vec![i]));
        }
    }
    let mut counter = 0usize;
    let mut next_key = || {
        counter += 1;
        format!("bk-{:06}", counter)
    };
    for (cluster_key, indexes) in &clusters {
        if indexes.len() == 1 {
            let key = next_key();
            assignments[indexes[0]] = key;
            continue;
        }
        // Union-find over "shares evidence".
        let mut parent: HashMap<usize, usize> = HashMap::new();
        for idx in indexes {
            parent.insert(*idx, *idx);
        }
        fn find(parent: &HashMap<usize, usize>, mut x: usize) -> usize {
            let mut p = *parent.get(&x).unwrap_or(&x);
            while *parent.get(&p).unwrap_or(&p) != p {
                p = *parent.get(&p).unwrap_or(&p);
            }
            x = p;
            x
        }
        for a in 0..indexes.len() {
            for b in (a + 1)..indexes.len() {
                let ea = evidence_of(&records[indexes[a]]);
                let eb = evidence_of(&records[indexes[b]]);
                if shares_evidence(&ea, &eb).is_some() {
                    let ra = find(&parent, indexes[a]);
                    let rb = find(&parent, indexes[b]);
                    if ra != rb {
                        parent.insert(ra, rb);
                    }
                }
            }
        }
        // Groups in first-appearance order of their root.
        let mut groups: Vec<(usize, Vec<usize>)> = Vec::new();
        for idx in indexes {
            let root = find(&parent, *idx);
            if let Some(entry) = groups.iter_mut().find(|(r, _)| *r == root) {
                entry.1.push(*idx);
            } else {
                groups.push((root, vec![*idx]));
            }
        }
        if groups.len() == 1 {
            let group = indexes;
            let evidence = shares_evidence(
                &evidence_of(&records[group[0]]),
                &evidence_of(&records[group[1]]),
            )
            .unwrap_or_else(|| "shared name + evidence".to_string());
            let key = next_key();
            for idx in group {
                assignments[*idx] = key.clone();
                statuses[*idx] = "merged".to_string();
            }
            decisions.push(Decision {
                business_key: Some(key),
                cluster_key: cluster_key.clone(),
                decision: "merged".to_string(),
                license_indexes: {
                    let mut v = group.clone();
                    v.sort_unstable();
                    v
                },
                rationale: format!("merged {} licenses on {}", group.len(), evidence),
            });
        } else {
            let merged_groups: Vec<Vec<usize>> = groups
                .iter()
                .map(|(_, g)| g.clone())
                .filter(|g| g.len() >= 2)
                .collect();
            for group in &merged_groups {
                let evidence = shares_evidence(
                    &evidence_of(&records[group[0]]),
                    &evidence_of(&records[group[1]]),
                )
                .unwrap_or_else(|| "shared name + evidence".to_string());
                let key = next_key();
                for idx in group.iter() {
                    assignments[*idx] = key.clone();
                    statuses[*idx] = "merged".to_string();
                }
                decisions.push(Decision {
                    business_key: Some(key),
                    cluster_key: cluster_key.clone(),
                    decision: "merged".to_string(),
                    license_indexes: {
                        let mut v = (*group).clone();
                        v.sort_unstable();
                        v
                    },
                    rationale: format!(
                        "merged {} licenses on {} (cluster splits into {} groups)",
                        group.len(),
                        evidence,
                        groups.len()
                    ),
                });
            }
            let mut conflict_found: Option<String> = None;
            for a in 0..indexes.len() {
                if conflict_found.is_some() {
                    break;
                }
                for b in (a + 1)..indexes.len() {
                    if let Some(cf) = conflicts(
                        &evidence_of(&records[indexes[a]]),
                        &evidence_of(&records[indexes[b]]),
                    ) {
                        conflict_found = Some(cf);
                        break;
                    }
                }
            }
            let singleton_count = groups.iter().filter(|(_, g)| g.len() == 1).count();
            let (decision, rationale) = match &conflict_found {
                Some(cf) => (
                    "rejected_no_merge".to_string(),
                    format!(
                        "not merged: same name but {} \u{2014} evidence says different businesses ({} groups, {} merged on evidence, {} held)",
                        cf,
                        groups.len(),
                        merged_groups.len(),
                        singleton_count
                    ),
                ),
                None => (
                    "held_ambiguous".to_string(),
                    format!(
                        "not merged: same name only for {} license(s) \u{2014} no shared phone or address evidence \u{2014} held for human review (cluster splits into {} groups, {} merged on evidence)",
                        singleton_count,
                        groups.len(),
                        merged_groups.len()
                    ),
                ),
            };
            for (_, group) in &groups {
                if group.len() >= 2 {
                    continue;
                }
                for idx in group {
                    let key = next_key();
                    assignments[*idx] = key;
                    statuses[*idx] = "ambiguous_held".to_string();
                }
            }
            decisions.push(Decision {
                business_key: None,
                cluster_key: cluster_key.clone(),
                decision,
                license_indexes: {
                    let mut v = indexes.clone();
                    v.sort_unstable();
                    v
                },
                rationale,
            });
        }
    }
    (assignments, statuses, decisions)
}

// ---------------------------------------------------------------------------
// Resource usage (Linux /proc).
// ---------------------------------------------------------------------------
fn cpu_ms() -> (f64, f64) {
    let stat = fs::read_to_string("/proc/self/stat").unwrap_or_default();
    let after_paren = stat.rfind(')').map(|i| i + 2).unwrap_or(0);
    let fields: Vec<&str> = stat[after_paren..].split_whitespace().collect();
    // fields[11] = utime, fields[12] = stime (0-based after comm).
    let utime: f64 = fields.get(11).and_then(|v| v.parse().ok()).unwrap_or(0.0);
    let stime: f64 = fields.get(12).and_then(|v| v.parse().ok()).unwrap_or(0.0);
    (utime * 10.0, stime * 10.0) // 100 ticks/sec -> ms
}

fn max_rss_kb() -> u64 {
    let status = fs::read_to_string("/proc/self/status").unwrap_or_default();
    for line in status.lines() {
        if let Some(rest) = line.strip_prefix("VmHWM:") {
            let num: String = rest.chars().filter(|c| c.is_ascii_digit()).collect();
            return num.parse().unwrap_or(0);
        }
    }
    0
}

struct SourceDef {
    as_of_date: &'static str,
    code: &'static str,
    file: &'static str,
    file_date: Option<&'static str>,
    trade: &'static str,
    url: &'static str,
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let mut staging = "/tmp/hcp-etl".to_string();
    let mut out_dir = "bench/out/rs".to_string();
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--staging" => {
                staging = args[i + 1].clone();
                i += 2;
            }
            "--out" => {
                out_dir = args[i + 1].clone();
                i += 2;
            }
            _ => i += 1,
        }
    }
    let start = Instant::now();
    let sources = [
        SourceDef {
            as_of_date: "2026-11-24",
            code: "tdlr-electrical",
            file: "Lteecele.csv",
            file_date: Some("2026-11-24"),
            trade: "electrical",
            url: "https://www.tdlr.texas.gov/dbproduction2/Lteecele.csv",
        },
        SourceDef {
            as_of_date: "2026-11-24",
            code: "tdlr-hvac",
            file: "ltairref.csv",
            file_date: Some("2026-11-24"),
            trade: "hvac",
            url: "https://www.tdlr.texas.gov/dbproduction2/ltairref.csv",
        },
        SourceDef {
            as_of_date: "2026-11-25",
            code: "tsbpe-rmp",
            file: "rmp_download",
            file_date: None,
            trade: "plumbing",
            url: "https://tsbpe.texas.gov/download-csv/RMP/",
        },
    ];
    fs::create_dir_all(&out_dir).expect("create out dir");
    let mut all_records: Vec<Record> = Vec::new();
    let mut all_businesses: Vec<Vec<String>> = Vec::new();
    let mut all_decisions: Vec<(String, String, Vec<String>, String)> = Vec::new();
    let mut input_sha: Vec<(String, String)> = Vec::new();
    let mut active = 0usize;
    let mut expired = 0usize;
    let mut unknown = 0usize;

    for src in &sources {
        let path = PathBuf::from(&staging)
            .join("staging")
            .join(src.code)
            .join(src.file);
        let bytes = fs::read(&path).unwrap_or_else(|e| panic!("read {}: {}", path.display(), e));
        let sha = sha256_hex(&bytes);
        input_sha.push((src.code.to_string(), sha.clone()));
        let text = String::from_utf8_lossy(&bytes).into_owned();
        let (_header, rows, errors) = parse_csv(&text);
        if !errors.is_empty() {
            eprintln!("parse errors in {}: {:?}", src.code, errors);
        }
        let ctx = Ctx {
            as_of_date: src.as_of_date.to_string(),
            file_date: src.file_date.map(|s| s.to_string()),
            file_name: src.file.to_string(),
            sha256: sha,
            source_code: src.code.to_string(),
            source_url: Some(src.url.to_string()),
            trade: src.trade.to_string(),
        };
        let mut records: Vec<Record> = Vec::with_capacity(rows.len());
        for row in &rows {
            let rec = if src.code == "tsbpe-rmp" {
                normalize_rmp(row, &ctx)
            } else {
                normalize_tdlr(row, &ctx)
            };
            match rec {
                Ok(r) => records.push(r),
                Err(e) => panic!("normalize error in {}: {}", src.code, e),
            }
        }
        let (assignments, _statuses, decisions) = dedupe(&records);
        let mut by_key: Vec<(String, Vec<String>)> = Vec::new();
        for (idx, r) in records.iter().enumerate() {
            let key = &assignments[idx];
            let id = r.identity();
            if let Some(entry) = by_key.iter_mut().find(|(k, _)| k == key) {
                entry.1.push(id);
            } else {
                by_key.push((key.clone(), vec![id]));
            }
        }
        for (_, mut list) in by_key {
            list.sort();
            all_businesses.push(list);
        }
        for d in decisions {
            let mut license_numbers: Vec<String> = d
                .license_indexes
                .iter()
                .map(|i| records[*i].identity())
                .collect();
            license_numbers.sort();
            all_decisions.push((
                d.cluster_key,
                d.decision,
                license_numbers,
                d.rationale,
            ));
        }
        for r in records {
            match r.license_status.as_str() {
                "active" => active += 1,
                "expired" => expired += 1,
                _ => unknown += 1,
            }
            all_records.push(r);
        }
    }

    all_records.sort_by(|a, b| {
        let ka = format!("{}|{}|{}", a.source_code, a.license_type, a.license_number);
        let kb = format!("{}|{}|{}", b.source_code, b.license_type, b.license_number);
        ka.cmp(&kb)
    });
    all_businesses.sort_by(|a, b| a[0].cmp(&b[0]));
    all_decisions.sort_by(|a, b| {
        let ka = format!("{}|{}|{}", a.0, a.1, a.2.first().map(|s| s.as_str()).unwrap_or(""));
        let kb = format!("{}|{}|{}", b.0, b.1, b.2.first().map(|s| s.as_str()).unwrap_or(""));
        ka.cmp(&kb)
    });

    let records_jsonl = all_records
        .iter()
        .map(|r| r.to_canonical_json())
        .collect::<Vec<String>>()
        .join("\n")
        + "\n";
    fs::write(PathBuf::from(&out_dir).join("records.jsonl"), records_jsonl)
        .expect("write records.jsonl");
    let businesses_json = format!(
        "[{}]\n",
        all_businesses
            .iter()
            .map(|list| format!(
                "[{}]",
                list.iter().map(|s| json_escape(s)).collect::<Vec<String>>().join(",")
            ))
            .collect::<Vec<String>>()
            .join(",")
    );
    fs::write(PathBuf::from(&out_dir).join("businesses.json"), businesses_json)
        .expect("write businesses.json");
    let dedupe_json = format!(
        "[{}]\n",
        all_decisions
            .iter()
            .map(|(cluster_key, decision, license_numbers, rationale)| format!(
                "{{\"cluster_key\":{},\"decision\":{},\"license_numbers\":[{}],\"rationale\":{}}}",
                json_escape(cluster_key),
                json_escape(decision),
                license_numbers
                    .iter()
                    .map(|s| json_escape(s))
                    .collect::<Vec<String>>()
                    .join(","),
                json_escape(rationale)
            ))
            .collect::<Vec<String>>()
            .join(",")
    );
    fs::write(PathBuf::from(&out_dir).join("dedupe.json"), dedupe_json)
        .expect("write dedupe.json");

    let (user_ms, sys_ms) = cpu_ms();
    let decisions_merged = all_decisions.iter().filter(|d| d.1 == "merged").count();
    let decisions_held = all_decisions.len() - decisions_merged;
    let sha_obj = input_sha
        .iter()
        .map(|(k, v)| format!("{}:{}", json_escape(k), json_escape(v)))
        .collect::<Vec<String>>()
        .join(",");
    let summary = format!(
        "{{\n  \"active\": {},\n  \"businesses\": {},\n  \"decisions_held\": {},\n  \"decisions_merged\": {},\n  \"engine\": \"rust-1.100.0\",\n  \"expired\": {},\n  \"input_sha256\": {{{}}},\n  \"max_rss_kb\": {},\n  \"records\": {},\n  \"sys_ms\": {:.1},\n  \"unknown\": {},\n  \"user_ms\": {:.1},\n  \"wall_ms\": {}\n}}\n",
        active,
        all_businesses.len(),
        decisions_held,
        decisions_merged,
        expired,
        sha_obj,
        max_rss_kb(),
        all_records.len(),
        sys_ms,
        unknown,
        user_ms,
        start.elapsed().as_millis()
    );
    fs::write(PathBuf::from(&out_dir).join("summary.json"), &summary)
        .expect("write summary.json");
    println!("{}", summary);
}
