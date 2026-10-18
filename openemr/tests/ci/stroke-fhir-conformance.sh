#!/usr/bin/env bash
# Run an exported Stroke Care FHIR Bundle through the official HL7 validator.
#
# This is deliberately separate from the local structural validator: passing
# local tests is not evidence of HL7 conformance.
#
# Required:
#   STROKE_BUNDLE_FILE   Exported activation/assessment Bundle JSON
# Plus either:
#   FHIR_VALIDATOR_JAR   Official validator_cli.jar (standalone, recommended)
#   FHIR_VALIDATOR_URL   Hosted validator endpoint accepting application/fhir+json
#
# Optional for the standalone validator:
#   FHIR_TX_URL          Terminology server (default https://tx.fhir.org/r4)
set -euo pipefail

: "${STROKE_BUNDLE_FILE:?set STROKE_BUNDLE_FILE to an exported FHIR Bundle}"
test -s "$STROKE_BUNDLE_FILE" || { echo "Bundle not found: $STROKE_BUNDLE_FILE" >&2; exit 2; }

OUT="$(mktemp)"
ERR="$(mktemp)"
trap 'rm -f "$OUT" "$ERR"' EXIT

if [ -n "${FHIR_VALIDATOR_JAR:-}" ]; then
    test -s "$FHIR_VALIDATOR_JAR" || { echo "Validator not found: $FHIR_VALIDATOR_JAR" >&2; exit 2; }
    set +e
    java -jar "$FHIR_VALIDATOR_JAR" "$STROKE_BUNDLE_FILE" \
        -version 4.0.1 -tx "${FHIR_TX_URL:-https://tx.fhir.org/r4}" \
        > "$OUT" 2> "$ERR"
    STATUS=$?
    set -e
    cat "$OUT"
    cat "$ERR" >&2
    grep -qE '^Success: 0 errors' "$OUT" || STATUS=1
    exit "$STATUS"
fi

: "${FHIR_VALIDATOR_URL:?set FHIR_VALIDATOR_JAR or FHIR_VALIDATOR_URL}"
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
