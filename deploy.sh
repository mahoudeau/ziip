#!/bin/bash
# Deploy script for ziip — pushes the built dist/ to lab.mathieu.dev/ziip via lftp.
#
# Usage: ./deploy.sh app lab [--dry-run]
#
# Reads FTP credentials from a local .env file (gitignored). See .env.example
# for the variables you need to set.

set -euo pipefail

KIND="${1:-}"
ENV="${2:-}"
DRY_RUN=""

for arg in "$@"; do
  [ "$arg" = "--dry-run" ] && DRY_RUN="--dry-run"
done

if [ "$KIND" != "app" ] || [ "$ENV" != "lab" ]; then
  echo "Usage: ./deploy.sh app lab [--dry-run]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

for var in FTP_HOST FTP_USER FTP_PASS FTP_LAB_DIR; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var not configured. Copy .env.example to .env and fill it in."
    exit 1
  fi
done

LOCAL_DIR="$SCRIPT_DIR/dist"
if [ ! -d "$LOCAL_DIR" ]; then
  echo "Error: $LOCAL_DIR/ not found. Run 'npm run build:lab' first."
  exit 1
fi

echo "Deploying ziip to LAB: lab.mathieu.dev/ziip"
echo "  $LOCAL_DIR/ -> $FTP_LAB_DIR"
[ -n "$DRY_RUN" ] && echo "  (dry-run: no files will actually transfer)"
echo "Press Ctrl+C to cancel..."
sleep 2

lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
set ssl:verify-certificate no
set net:timeout 30
set net:max-retries 3
mirror --reverse --delete --verbose --parallel=4 $DRY_RUN \
  "$LOCAL_DIR" "$FTP_LAB_DIR"
bye
EOF

echo "Lab deploy complete."
