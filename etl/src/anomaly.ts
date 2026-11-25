// Anomaly detection (US5, etl-pipeline.md §4).
// Pure function: thresholds come from config, never hardcoded in the caller.
// Every check records name / observed / threshold / previous value so the
// run row and the dry-run report can cite it.

export interface AnomalyThresholds {
  expired_share_jump_points: number;
  parse_error_pct: number;
  row_count_jump_pct: number;
  unparseable_date_pct: number;
}

export interface AnomalyInput {
  currentRowCount: number;
  duplicateIdentityCount: number;
  expiredSharePct: number;
  parseErrorCount: number;
  parseErrorRatePct: number;
  previousExpiredSharePct: number | null;
  previousRowCount: number | null;
  unparseableDateCount: number;
  unparseableDateRatePct: number;
}

export interface AnomalyCheck {
  blocked: boolean;
  name: string;
  observed: string;
  previous: string | null;
  threshold: string;
}

export interface AnomalyVerdict {
  blocked: boolean;
  checks: AnomalyCheck[];
}

export function checkAnomalies(
  input: AnomalyInput,
  thresholds: AnomalyThresholds,
): AnomalyVerdict {
  const checks: AnomalyCheck[] = [];
  if (input.previousRowCount !== null && input.previousRowCount > 0) {
    const changePct =
      ((input.currentRowCount - input.previousRowCount) /
        input.previousRowCount) *
      100;
    checks.push({
      blocked: Math.abs(changePct) > thresholds.row_count_jump_pct,
      name: "row_count_jump",
      observed: `${input.currentRowCount} rows (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% vs previous)`,
      previous: String(input.previousRowCount),
      threshold: `> ${thresholds.row_count_jump_pct}% change vs previous successful run`,
    });
  } else {
    checks.push({
      blocked: false,
      name: "row_count_jump",
      observed: `${input.currentRowCount} rows (no previous successful run — check skipped)`,
      previous: null,
      threshold: `> ${thresholds.row_count_jump_pct}% change vs previous successful run`,
    });
  }
  checks.push({
    blocked:
      input.parseErrorRatePct > thresholds.parse_error_pct ||
      input.parseErrorCount > 0 && input.currentRowCount === 0,
    name: "parse_errors",
    observed: `${input.parseErrorCount} parse errors (${input.parseErrorRatePct.toFixed(2)}% of rows)`,
    previous: null,
    threshold: `> ${thresholds.parse_error_pct}% of rows`,
  });
  checks.push({
    blocked: input.unparseableDateRatePct > thresholds.unparseable_date_pct,
    name: "unparseable_dates",
    observed: `${input.unparseableDateCount} unparseable dates (${input.unparseableDateRatePct.toFixed(2)}% of rows)`,
    previous: null,
    threshold: `> ${thresholds.unparseable_date_pct}% of rows`,
  });
  checks.push({
    blocked: input.duplicateIdentityCount > 0,
    name: "duplicate_license_identity",
    observed: `${input.duplicateIdentityCount} duplicate (type, number) pairs within the file`,
    previous: null,
    threshold: "any (> 0)",
  });
  if (
    input.previousExpiredSharePct !== null &&
    input.previousRowCount !== null
  ) {
    const jump = Math.abs(
      input.expiredSharePct - input.previousExpiredSharePct,
    );
    checks.push({
      blocked: jump > thresholds.expired_share_jump_points,
      name: "expired_share_jump",
      observed: `expired share ${input.expiredSharePct.toFixed(2)}% (previous ${input.previousExpiredSharePct.toFixed(2)}%, jump ${jump.toFixed(2)} points)`,
      previous: `${input.previousExpiredSharePct.toFixed(2)}%`,
      threshold: `> ${thresholds.expired_share_jump_points} points`,
    });
  } else {
    checks.push({
      blocked: false,
      name: "expired_share_jump",
      observed: `expired share ${input.expiredSharePct.toFixed(2)}% (no previous successful run — check skipped)`,
      previous: null,
      threshold: `> ${thresholds.expired_share_jump_points} points`,
    });
  }
  checks.push({
    blocked: input.currentRowCount === 0,
    name: "empty_file",
    observed: `${input.currentRowCount} data rows`,
    previous: null,
    threshold: "0 data rows",
  });
  return { blocked: checks.some((c) => c.blocked), checks };
}
