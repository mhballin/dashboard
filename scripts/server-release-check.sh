#!/usr/bin/env bash
# Run this on the Oracle host after deploying API changes.
set -euo pipefail

API_HEALTH_URL="${API_HEALTH_URL:-https://api.dashboard.michaelballin.com/health}"
API_SERVICE="${API_SERVICE:-job-dashboard-api.service}"
PB_SERVICE="${PB_SERVICE:-pocketbase.service}"

echo "==> Checking service status"
sudo systemctl is-active --quiet "$API_SERVICE"
sudo systemctl is-active --quiet "$PB_SERVICE"
echo "Services are active: $API_SERVICE, $PB_SERVICE"

echo "==> Running API health check"
HEALTH_PAYLOAD="$(curl -fsS "$API_HEALTH_URL")"
echo "$HEALTH_PAYLOAD"

if [[ "$HEALTH_PAYLOAD" != *'"ok":true'* ]] && [[ "$HEALTH_PAYLOAD" != *'"ok": true'* ]]; then
  echo "Health payload did not include ok=true" >&2
  exit 1
fi

echo "==> Recent API logs"
sudo journalctl -u "$API_SERVICE" -n 80 --no-pager

echo "==> Recent PocketBase logs"
sudo journalctl -u "$PB_SERVICE" -n 40 --no-pager

echo "Release verification checks passed."