#!/usr/bin/env bash
set -euo pipefail

# Load from config.env if present
CONFIG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$CONFIG_DIR/config.env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$CONFIG_DIR/config.env" | xargs -d '\n')
fi

: "${API_BASE:=http://localhost:3000/api/v1}"
: "${HOST_EMAIL:=host@test.dev}"
: "${HOST_PASSWORD:=password123}"
: "${GUEST_EMAIL:=participant@test.dev}"
: "${GUEST_PASSWORD:=password123}"

export API_BASE HOST_EMAIL HOST_PASSWORD GUEST_EMAIL GUEST_PASSWORD

echo "API_BASE=$API_BASE"