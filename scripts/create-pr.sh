#!/usr/bin/env bash
set -euo pipefail

TITLE="$1"
BODY_FILE="$2"
LABELS="${3:-}"
BASE="${4:-develop}"

LABEL_ARGS=()
if [[ -n "$LABELS" ]]; then
  IFS=',' read -ra LABEL_ARRAY <<< "$LABELS"
  for label in "${LABEL_ARRAY[@]}"; do
    LABEL_ARGS+=(--label "$label")
  done
fi

gh pr create \
  --base "$BASE" \
  --title "$TITLE" \
  --body-file "$BODY_FILE" \
  "${LABEL_ARGS[@]}"
