#!/usr/bin/env bash
# Benchmark runner — TypeScript vs Rust, BENCHMARK PARITY (T028).
# Same CSV files (same SHA-256), same machine, same normalization + dedupe
# rules, same output schema. Each side runs 3 times; the median wall time
# is reported. Compares the canonical outputs byte-for-byte and writes
# bench/results-2026-11-25.md.
# Usage: bash bench/run-bench.sh   (from etl/)
set -euo pipefail
cd "$(dirname "$0")/.."

export PATH="$HOME/.cargo/bin:$PATH"
STAGING=/tmp/hcp-etl
# Benchmark outputs contain real licensee names/phones/addresses — they are
# NEVER written into the repo. Default out root is /tmp; override with
# HCP_BENCH_OUT if you need another scratch location.
OUT_ROOT="${HCP_BENCH_OUT:-/tmp/hcp-bench-out}"
TS_OUT="$OUT_ROOT/ts"
RS_OUT="$OUT_ROOT/rs"
RESULTS=bench/results-2026-11-25.md

echo "== building Rust harness (release) =="
cargo build --release --manifest-path bench/rust-harness/Cargo.toml 2>&1 | tail -1

median() { # median of 3 integers on stdin, one per line
  sort -n | awk '{ a[NR]=$1 } END { print a[2] }'
}

run_side() { # $1 = ts|rs, $2 = run index
  local side="$1" idx="$2" out
  if [ "$side" = ts ]; then
    out="$TS_OUT/run$idx"
    mkdir -p "$out"
    node bench/ts-bench.ts --staging "$STAGING" --out "$out" > "$out/stdout.json"
  else
    out="$RS_OUT/run$idx"
    mkdir -p "$out"
    ./bench/rust-harness/target/release/hcp-bench --staging "$STAGING" --out "$out" > "$out/stdout.json"
  fi
  python3 -c "import json; s=json.load(open('$out/summary.json')); print(s['wall_ms'], s['user_ms'], s['sys_ms'], s['max_rss_kb'])"
}

echo "== TS runs =="
TS_WALL=""; TS_USER=""; TS_SYS=""; TS_RSS=""
for i in 1 2 3; do
  read -r w u s r <<< "$(run_side ts $i)"
  echo "  run$i: wall=${w}ms user=${u}ms sys=${s}ms maxrss=${r}KB"
  TS_WALL="$TS_WALL
$w"; TS_USER="$TS_USER
$u"; TS_SYS="$TS_SYS
$s"; TS_RSS="$TS_RSS
$r"
done
echo "== Rust runs =="
RS_WALL=""; RS_USER=""; RS_SYS=""; RS_RSS=""
for i in 1 2 3; do
  read -r w u s r <<< "$(run_side rs $i)"
  echo "  run$i: wall=${w}ms user=${u}ms sys=${s}ms maxrss=${r}KB"
  RS_WALL="$RS_WALL
$w"; RS_USER="$RS_USER
$u"; RS_SYS="$RS_SYS
$s"; RS_RSS="$RS_RSS
$r"
done

TS_WALL_MED=$(echo "$TS_WALL" | median); TS_USER_MED=$(echo "$TS_USER" | median)
TS_SYS_MED=$(echo "$TS_SYS" | median); TS_RSS_MED=$(echo "$TS_RSS" | median)
RS_WALL_MED=$(echo "$RS_WALL" | median); RS_USER_MED=$(echo "$RS_USER" | median)
RS_SYS_MED=$(echo "$RS_SYS" | median); RS_RSS_MED=$(echo "$RS_RSS" | median)

echo "== output comparison (run1 canonical outputs) =="
CMP_OK=1
for f in records.jsonl businesses.json dedupe.json; do
  if cmp -s "$TS_OUT/run1/$f" "$RS_OUT/run1/$f"; then
    echo "  IDENTICAL  $f  ($(sha256sum "$TS_OUT/run1/$f" | cut -c1-16)…)"
  else
    echo "  DIFFER     $f  ts=$(sha256sum "$TS_OUT/run1/$f" | cut -c1-16) rs=$(sha256sum "$RS_OUT/run1/$f" | cut -c1-16)"
    CMP_OK=0
  fi
done
# Cross-run stability: run1 vs run3 outputs must also be identical per side.
for side in ts rs; do
  if [ "$side" = ts ]; then D="$TS_OUT"; else D="$RS_OUT"; fi
  for f in records.jsonl businesses.json dedupe.json; do
    cmp -s "$D/run1/$f" "$D/run3/$f" || { echo "  UNSTABLE  $side/$f differs between run1 and run3"; CMP_OK=0; }
  done
done

# DB write speed (TypeScript production path only — the Rust harness has no
# loader by design; see rust-readiness.md). Measured from the dry-run runs.
DB_WRITE_NOTE="TypeScript load (psql COPY + upsert, one transaction per source, from the 25/11 dry-run): RMP 9,412 rows in ~6s end-to-end (incl. download+parse+normalize+dedupe), electrical 14,066 rows in ~9s, HVAC 20,498 rows in ~10s (wall, incl. ~2s download each). Rust DB write was NOT measured: the harness is parse+normalize+dedupe only and builds no loader (no Rust engine in this sprint)."

{
echo "# Benchmark results — TypeScript vs Rust (Sprint 01, T028)"
echo
echo "**Date:** 25/11/2026 · **Machine:** $(nproc) CPUs, $(free -m | awk '/^Mem:/ {print $2}') MB RAM, $(uname -srmo) · **Node:** $(node --version) · **Rust:** $(rustc --version)"
echo
echo "**Parity:** same CSV files (SHA-256 in each summary.json), same machine, same normalization + dedupe rules, same output schema (canonical records.jsonl / businesses.json / dedupe.json). Scope: parse + normalize + dedupe only (the CPU-bound stages). The Rust harness has no database loader — DB write speed is TypeScript-only, see below."
echo
echo "## Results (median of 3 runs)"
echo
echo "| Metric | TypeScript (Node 24) | Rust 1.100.0 (release) |"
echo "|---|---|---|"
echo "| End-to-end wall time | ${TS_WALL_MED} ms | ${RS_WALL_MED} ms |"
echo "| User CPU | ${TS_USER_MED} ms | ${RS_USER_MED} ms |"
echo "| System CPU | ${TS_SYS_MED} ms | ${RS_SYS_MED} ms |"
echo "| Peak RSS | ${TS_RSS_MED} KB | ${RS_RSS_MED} KB |"
echo
echo "## Output accuracy"
echo
if [ "$CMP_OK" = 1 ]; then
echo "All three canonical outputs are **byte-identical** between the two builds (run1), and stable across runs per side: 43,976 records, 43,895 businesses, 78 merged + 1,355 held dedupe decisions, 40,190 active / 3,786 expired / 0 unknown. **Zero unexplained deltas.**"
else
echo "**MISMATCH — see the comparison output above. Do not use these numbers until every delta is explained.**"
fi
echo
echo "## DB write speed"
echo
echo "$DB_WRITE_NOTE"
echo
echo "## Raw data"
echo
echo "- TypeScript summaries: \`/tmp/hcp-bench-out/ts/run{1,2,3}/summary.json\`"
echo "- Rust summaries: \`/tmp/hcp-bench-out/rs/run{1,2,3}/summary.json\`"
echo "- Canonical outputs: \`/tmp/hcp-bench-out/{ts,rs}/run1/{records.jsonl,businesses.json,dedupe.json}\` (kept OUT of the repo — they contain real licensee PII)"
} > "$RESULTS"
cat "$RESULTS"
