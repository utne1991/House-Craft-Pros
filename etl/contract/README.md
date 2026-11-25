# etl/contract/ — versioned data contract

The language-independent contract for the Data Ingestion Engine.

| File | What it is |
|---|---|
| `normalized-record.v1.json` | JSON Schema (draft 2020-12) for ONE normalized license record. **Canonical source for record shape.** Validated 25/11/2026: the embedded example validates, and the `expiration_date` → never `authority-confirmed` invariant is enforced by the schema's `if/then` (tested). |
| `../../docs/architecture/data-contract.md` | Human-readable contract: source adapter interface, loader interface, DB contract, versioning rules, compatibility-test list. |

Rules:

- **JSON Schema + SQL DDL (`db/migrations/`) are the contract.** TypeScript
  (or future Rust) types are derived from them, never the standard.
- **Every normalized record carries `contract_version`** (`"v1"` today).
  Every `ingestion_runs` row records the version that produced it
  (`contract_version` column). Every persisted license row carries it too
  (`licenses.contract_version`).
- **Versioning:** adding an OPTIONAL field = minor (backwards-compatible).
  Any breaking change (remove/rename a field, change a type, make a field
  required, change an enum's meaning, change the upsert identity) = new major
  version + new schema file + migration + entry in `data-contract.md` §8.
- **New versions** are added as new files (`normalized-record.v2.json`); old
  files are never edited in place after a sprint accepts them.
