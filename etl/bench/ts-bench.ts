// TypeScript side of the Rust-readiness benchmark (T025/T028).
// Runs ONLY the CPU-bound stages — parse + normalize + dedupe — over the
// same fresh CSV files the dry-run loaded, and writes canonical output
// files for byte comparison against the Rust harness:
//   records.jsonl  — one canonical JSON object per normalized record
//   businesses.json — the dedupe partition (sorted license identities)
//   dedupe.json    — dedupe decisions (cluster, decision, license numbers)
//   summary.json   — counts + timing + CPU + peak RSS + input checksums
// This is a BENCHMARK driver, not the production path (src/run.ts is).
// Usage: node bench/ts-bench.ts --staging /tmp/hcp-etl --out bench/out/ts

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../src/csv.ts";
import { businessRows, dedupe } from "../src/dedupe.ts";
import { normalizeRow, type NormalizeContext } from "../src/normalize.ts";

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
}

function identity(sourceCode: string, r: { license_number: string; license_type: string }): string {
  return `${sourceCode}|${r.license_type}|${r.license_number}`;
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

const SOURCES = [
  {
    asOfDate: "2026-11-24",
    code: "tdlr-electrical",
    file: "Lteecele.csv",
    fileDate: "2026-11-24",
    trade: "electrical",
    url: "https://www.tdlr.texas.gov/dbproduction2/Lteecele.csv",
  },
  {
    asOfDate: "2026-11-24",
    code: "tdlr-hvac",
    file: "ltairref.csv",
    fileDate: "2026-11-24",
    trade: "hvac",
    url: "https://www.tdlr.texas.gov/dbproduction2/ltairref.csv",
  },
  {
    asOfDate: "2026-11-25",
    code: "tsbpe-rmp",
    file: "rmp_download",
    fileDate: null as string | null,
    trade: "plumbing",
    url: "https://tsbpe.texas.gov/download-csv/RMP/",
  },
];

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const staging = args["staging"] ?? "/tmp/hcp-etl";
  const outDir = args["out"] ?? "bench/out/ts";
  mkdirSync(outDir, { recursive: true });
  const startCpu = process.cpuUsage();
  const startWall = performance.now();

  const allRecords: Array<Record<string, unknown>> = [];
  const allBusinesses: string[][] = [];
  const allDecisions: Array<Record<string, unknown>> = [];
  const inputSha: Record<string, string> = {};
  let active = 0;
  let expired = 0;
  let unknown = 0;

  for (const src of SOURCES) {
    const filePath = join(staging, "staging", src.code, src.file);
    const bytes = readFileSync(filePath);
    const sha = createHash("sha256").update(bytes).digest("hex");
    inputSha[src.code] = sha;
    const parsed = parseCsv(bytes.toString("utf8"));
    const ctx: NormalizeContext = {
      asOfDate: src.asOfDate,
      fileDate: src.fileDate,
      fileName: src.file,
      sha256: sha,
      sourceCode: src.code,
      sourceUrl: src.url,
      trade: src.trade,
    };
    const records = parsed.rows.map((row, i) => normalizeRow(row, ctx, i + 2));
    const result = dedupe(records);
    const businesses = businessRows(records, result);
    // Partition: license identities per business, sorted.
    const byKey = new Map<string, string[]>();
    records.forEach((r, i) => {
      const key = result.assignments[i].businessKey;
      const list = byKey.get(key) ?? [];
      list.push(identity(src.code, r));
      byKey.set(key, list);
    });
    for (const list of byKey.values()) {
      list.sort();
      allBusinesses.push(list);
    }
    void businesses;
    for (const d of result.decisions) {
      allDecisions.push({
        cluster_key: d.clusterKey,
        decision: d.decision,
        license_numbers: d.licenseIndexes
          .map((i) => identity(src.code, records[i]))
          .sort(),
        rationale: d.rationale,
      });
    }
    for (const r of records) {
      if (r.license_status === "active") active += 1;
      else if (r.license_status === "expired") expired += 1;
      else unknown += 1;
      allRecords.push(r as unknown as Record<string, unknown>);
    }
  }

  allRecords.sort((a, b) => {
    const ka = `${a["source_code"]}|${a["license_type"]}|${a["license_number"]}`;
    const kb = `${b["source_code"]}|${b["license_type"]}|${b["license_number"]}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  allBusinesses.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  allDecisions.sort((a, b) => {
    const ka = `${a["cluster_key"]}|${a["decision"]}|${(a["license_numbers"] as string[])[0]}`;
    const kb = `${b["cluster_key"]}|${b["decision"]}|${(b["license_numbers"] as string[])[0]}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  writeFileSync(join(outDir, "records.jsonl"), allRecords.map(canonical).join("\n") + "\n", "utf8");
  writeFileSync(join(outDir, "businesses.json"), canonical(allBusinesses) + "\n", "utf8");
  writeFileSync(join(outDir, "dedupe.json"), canonical(allDecisions) + "\n", "utf8");

  const cpu = process.cpuUsage(startCpu);
  const summary = {
    active,
    businesses: allBusinesses.length,
    decisions_held: allDecisions.filter((d) => d["decision"] !== "merged").length,
    decisions_merged: allDecisions.filter((d) => d["decision"] === "merged").length,
    engine: "typescript-node-24.22.1",
    expired,
    input_sha256: inputSha,
    max_rss_kb: process.resourceUsage().maxRSS,
    records: allRecords.length,
    sys_ms: cpu.system / 1000,
    unknown,
    user_ms: cpu.user / 1000,
    wall_ms: Math.round(performance.now() - startWall),
  };
  writeFileSync(join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

main();
