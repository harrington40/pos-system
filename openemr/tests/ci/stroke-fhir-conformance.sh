#!/usr/bin/env bash
# Run an exported Stroke Care FHIR Bundle through the official HL7 validator.
#
# This is deliberately separate from the local structural validator: passing
# local tests is not evidence of HL7 conformance.
#
# Required:
#   FHIR_VALIDATOR_URL   Validator endpoint accepting application/fhir+json
#   STROKE_BUNDLE_FILE   Exported activation/assessment Bundle JSON
set -euo pipefail

: "${FHIR_VALIDATOR_URL:?set FHIR_VALIDATOR_URL to the official validator endpoint}"
: "${STROKE_BUNDLE_FILE:?set STROKE_BUNDLE_FILE to an exported FHIR Bundle}"

test -s "$STROKE_BUNDLE_FILE" || { echo "Bundle not found: $STROKE_BUNDLE_FILE" >&2; exit 2; }

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT

curl -fsS -X POST \
    -H 'Content-Type: application/fhir+json' \
    -H 'Accept: application/fhir+json' \
    --data-binary "@$STROKE_BUNDLE_FILE" \
    "$FHIR_VALIDATOR_URL" > "$OUT"

python3 - "$OUT" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as handle:
    result = json.load(handle)
issues = result.get("issue", [])
errors = [i for i in issues if i.get("severity") in ("error", "fatal")]
for issue in issues:
    print(f"{issue.get('severity', 'info')}: {issue.get('diagnostics', '')}")
print(json.dumps({"issues": len(issues), "errors": len(errors)}))
raise SystemExit(1 if errors else 0)
PY
