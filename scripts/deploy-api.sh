#!/usr/bin/env bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
APP_DIR="/home/ubuntu/dashboard"
SERVICE_NAME="job-dashboard-api"
HEALTH_URL="http://127.0.0.1:3001/health"
MAX_RETRIES=5
RETRY_DELAY=2

# ── Save current state for rollback ───────────────────────────
cd "$APP_DIR"
PREV_COMMIT=$(git rev-parse HEAD)
echo "🚀 Deploying API server..."
echo "   Current commit: $(git rev-parse --short HEAD)"

# ── Pull latest ───────────────────────────────────────────────
git pull origin main
NEW_COMMIT=$(git rev-parse HEAD)

if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
  echo "✅ Already up to date. Nothing to deploy."
  exit 0
fi

echo "   New commit:     $(git rev-parse --short HEAD)"

# ── Install deps only if lockfile changed ─────────────────────
if git diff "$PREV_COMMIT" "$NEW_COMMIT" --name-only | grep -q "server/package-lock.json"; then
  echo "📦 package-lock.json changed — running npm ci..."
  npm --prefix server ci --omit=dev
else
  echo "📦 No dependency changes — skipping install."
fi

# ── Restart service ───────────────────────────────────────────
echo "🔄 Restarting $SERVICE_NAME..."
sudo systemctl restart "$SERVICE_NAME"

# ── Health check with retries ─────────────────────────────────
echo "🏥 Running health check..."
for i in $(seq 1 $MAX_RETRIES); do
  sleep "$RETRY_DELAY"
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "✅ Deploy successful!"
    echo "   Commit: $(git rev-parse --short HEAD)"
    echo "   Health: $(curl -s "$HEALTH_URL")"
    exit 0
  fi
  echo "   Attempt $i/$MAX_RETRIES failed, retrying..."
done

# ── Rollback on failure ──────────────────────────────────────
echo "❌ Health check failed after $MAX_RETRIES attempts!"
echo "🔙 Rolling back to $PREV_COMMIT..."
git checkout "$PREV_COMMIT"

if git diff "$NEW_COMMIT" "$PREV_COMMIT" --name-only | grep -q "server/package-lock.json"; then
  npm --prefix server ci --omit=dev
fi

sudo systemctl restart "$SERVICE_NAME"
sleep "$RETRY_DELAY"

if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
  echo "✅ Rollback successful. Service restored."
else
  echo "🚨 ROLLBACK ALSO FAILED. Manual intervention needed."
  echo "   Run: sudo systemctl status $SERVICE_NAME"
  echo "   Run: sudo journalctl -u $SERVICE_NAME --since '5 min ago'"
fi

exit 1
