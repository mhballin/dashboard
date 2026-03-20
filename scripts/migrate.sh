#!/usr/bin/env bash
# Usage: npm run migrate -- <script-name.js>
# Credentials must be set up on the server in ~/.pb_env (chmod 600).
set -euo pipefail

SCRIPT="${1:-}"

if [[ -z "$SCRIPT" ]]; then
  echo "Usage: npm run migrate -- <script-name.js>" >&2
  echo "Example: npm run migrate -- add-new-field.js" >&2
  exit 1
fi

# Block path traversal — only plain .js filenames are allowed
if [[ "$SCRIPT" != *.js ]] || [[ "$SCRIPT" == */* ]] || [[ "$SCRIPT" == *..* ]]; then
  echo "Error: provide a plain .js filename only (e.g. add-new-field.js)" >&2
  exit 1
fi

LOCAL_PATH="scripts/$SCRIPT"

if [[ ! -f "$LOCAL_PATH" ]]; then
  echo "Error: $LOCAL_PATH not found in this repo." >&2
  exit 1
fi

# Unique remote name avoids collisions if run more than once at the same time
REMOTE_FILE="migrate_$$_$(date +%s).js"

echo "→ Uploading $SCRIPT to server..."
scp "$LOCAL_PATH" "dashboard:~/$REMOTE_FILE"

echo "→ Running migration on server..."
# Sources nvm (most common node install method) + credentials, cleans up on pass OR fail
ssh dashboard "bash -l << 'ENDSSH'
  export NVM_DIR=\"\$HOME/.nvm\"
  [ -s \"\$NVM_DIR/nvm.sh\" ] && source \"\$NVM_DIR/nvm.sh\"
  [ -f ~/.pb_env ] && source ~/.pb_env
  node ~/${REMOTE_FILE}
  EXIT=\$?
  rm -f ~/${REMOTE_FILE}
  exit \$EXIT
ENDSSH"
