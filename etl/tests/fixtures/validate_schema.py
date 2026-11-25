#!/usr/bin/env python3
"""JSON Schema validation oracle for the contract tests (T027).

The ETL itself is zero-dependency, so it cannot bundle a JSON Schema
validator. The compatibility tests use the installed Python `jsonschema`
package as the validation oracle: this script validates one record file
against one schema file and exits 0 (valid) or 1 (invalid, errors on
stdout). The contract file etl/contract/normalized-record.v1.json remains
the canonical source; this script is only the oracle that reads it.
Usage: validate_schema.py <schema.json> <record.json>
"""
import json
import sys

import jsonschema

schema = json.load(open(sys.argv[1]))
record = json.load(open(sys.argv[2]))
try:
    jsonschema.validate(record, schema)
except jsonschema.ValidationError as e:
    print(f"INVALID: {e.message} (at {'/'.join(str(p) for p in e.absolute_path)})")
    sys.exit(1)
print("VALID")
