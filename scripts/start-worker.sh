#!/usr/bin/env bash
# Start the Python Worker pipeline server
# Usage: ./scripts/start-worker.sh [--port 9120] [--dry-run]

set -euo pipefail

PORT="${2:-9120}"
DRY="${3:-}"

# Validate required env vars
: "${AI_API_KEY:?Must set AI_API_KEY}"
: "${AI_MODEL:?Must set AI_MODEL}"

cd "$(dirname "$0")/.."

echo "Starting Pipeline Worker on 127.0.0.1:${PORT}  (dry_run=${DRY:+true})"
exec python -m workers.server --port "$PORT" $DRY
