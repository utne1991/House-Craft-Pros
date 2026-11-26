// License lookup CLI (Sprint 02, local only — no HTTP server, no deploy).
//
//   node src/lookup-cli.ts --license 1001 --trade plumbing
//   node src/lookup-cli.ts --license 90001 --trade electrical
//   node src/lookup-cli.ts --name "SMITH PLUMBING LLC"
//   node src/lookup-cli.ts --name "SMITH PLUMBING LLC" --trade electrical
//   node src/lookup-cli.ts --license 1001 --trade plumbing --db housecraftpros
//
// Prints one JSON object (LookupResult) to stdout. Exit 0 on a successful
// query (including found:false — "not found" is an answer, not an error);
// exit 2 on bad arguments, exit 1 on a database error. Read-only: the
// lookup module only runs SELECTs. HCP_DB overrides the database name.

import { DB_NAME } from "./pg.ts";
import { lookupByLicense, lookupByName } from "./lookup.ts";
import type { Trade } from "./lookup.ts";

function usage(): void {
  console.error(
    "usage: node src/lookup-cli.ts --license <number> --trade <electrical|hvac|plumbing>\n" +
      "       node src/lookup-cli.ts --name <business name> [--trade <electrical|hvac|plumbing>]\n" +
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
  const license = argValue(args, "--license");
  const name = argValue(args, "--name");
  const tradeRaw = argValue(args, "--trade");

  if ((license === undefined) === (name === undefined)) {
    console.error("error: pass exactly one of --license or --name");
    usage();
    process.exit(2);
  }
  let trade: Trade | null = null;
  if (tradeRaw !== undefined) {
    if (tradeRaw !== "electrical" && tradeRaw !== "hvac" && tradeRaw !== "plumbing") {
      console.error(`error: unknown trade ${JSON.stringify(tradeRaw)} (want electrical|hvac|plumbing)`);
      usage();
      process.exit(2);
    }
    trade = tradeRaw;
  }
  if (license !== undefined && trade === null) {
    console.error("error: --license requires --trade");
    usage();
    process.exit(2);
  }

  const result =
    license !== undefined
      ? lookupByLicense(trade as Trade, license, db)
      : lookupByName(name as string, trade, db);
  console.log(JSON.stringify(result, null, 2));
}

main();
