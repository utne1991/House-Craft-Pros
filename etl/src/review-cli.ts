// Human review CLI for held dedupe clusters (Sprint 02, local only).
//
//   node src/review-cli.ts --list [--limit 50]
//   node src/review-cli.ts --show "smith plumbing llc"
//   node src/review-cli.ts --decide "held merge llc" --decision merge --by "owner" [--note "..."] [--confirm]
//   node src/review-cli.ts --decide "smith plumbing llc" --decision keep-separate --by "owner" [--confirm]
//
// --decide prints a PLAN unless --confirm is passed: a human reviews the
// plan first, then re-runs with --confirm to execute. --by names the human
// reviewer and is required. Prints JSON to stdout; exit 0 on success,
// exit 2 on bad arguments, exit 1 when the cluster cannot be decided
// (unknown key, already decided, fewer than 2 live licenses) or the
// transaction fails (nothing is applied on failure). HCP_DB overrides
// the database name.

import { DB_NAME } from "./pg.ts";
import {
  applyKeepSeparate,
  applyMerge,
  listHeldClusters,
  planMerge,
  showCluster,
} from "./review.ts";

function usage(): void {
  console.error(
    "usage: node src/review-cli.ts --list [--limit N]\n" +
      "       node src/review-cli.ts --show <cluster_key>\n" +
      "       node src/review-cli.ts --decide <cluster_key> --decision merge|keep-separate --by <identifier> [--note ...] [--confirm]\n" +
      "       [--db <database>]",
  );
}

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const db = argValue(args, "--db") ?? DB_NAME;

  if (args.includes("--list")) {
    const limitRaw = argValue(args, "--limit");
    const limit = limitRaw === undefined ? 50 : Number(limitRaw);
    if (!Number.isFinite(limit) || limit < 1) {
      console.error("error: --limit must be a positive number");
      usage();
      process.exit(2);
    }
    console.log(JSON.stringify({ clusters: listHeldClusters(db, limit) }, null, 2));
    return;
  }

  const show = argValue(args, "--show");
  if (show !== undefined) {
    console.log(JSON.stringify(showCluster(db, show), null, 2));
    return;
  }

  const key = argValue(args, "--decide");
  if (key !== undefined) {
    const decision = argValue(args, "--decision");
    const by = argValue(args, "--by");
    const note = argValue(args, "--note");
    if (decision !== "merge" && decision !== "keep-separate") {
      console.error("error: --decision must be merge or keep-separate");
      usage();
      process.exit(2);
    }
    if (by === undefined) {
      console.error("error: --by <identifier> is required: a human must own the decision");
      usage();
      process.exit(2);
    }
    if (!args.includes("--confirm")) {
      // Plan only: the human reviews it, then re-runs with --confirm.
      if (decision === "merge") {
        console.log(JSON.stringify({ plan: planMerge(db, key) }, null, 2));
      } else {
        const detail = showCluster(db, key);
        console.log(
          JSON.stringify(
            {
              plan: {
                action: "keep-separate",
                cluster_key: key,
                decision: "rejected_no_merge",
                license_ids: detail.licenses.map((l) => l.id),
                note: note ?? null,
              },
            },
            null,
            2,
          ),
        );
      }
      return;
    }
    const result =
      decision === "merge"
        ? applyMerge(db, key, by, note)
        : applyKeepSeparate(db, key, by, note);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error("error: pass one of --list, --show, or --decide");
  usage();
  process.exit(2);
}

main();
