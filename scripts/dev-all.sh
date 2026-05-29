#!/usr/bin/env bash
# Start both Worker and Next.js dev server
# Usage: ./scripts/dev-all.sh
#
# Requires:
#   AI_API_KEY=sk-...
#   AI_MODEL=deepseek-chat

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Start Worker in background
echo "Starting Worker..."
cd "$ROOT"
python -m workers.server --port 9120 &
WORKER_PID=$!
echo "Worker PID: $WORKER_PID"

# Give Worker a moment to bind
sleep 1

# Verify Worker is up
if ! curl -sf http://127.0.0.1:9120/health > /dev/null 2>&1; then
    echo "ERROR: Worker failed to start"
    kill $WORKER_PID 2>/dev/null
    exit 1
fi
echo "Worker is healthy"

# Start Next.js
echo "Starting Next.js dev server..."
cd "$ROOT/vibecraft"
npm run dev &
NEXT_PID=$!
echo "Next.js PID: $NEXT_PID"

# Trap to clean up both on exit
cleanup() {
    echo "Shutting down..."
    kill $WORKER_PID $NEXT_PID 2>/dev/null
    wait
}
trap cleanup EXIT INT TERM

echo ""
echo "  Worker:    http://127.0.0.1:9120/health"
echo "  Next.js:   http://127.0.0.1:3008"
echo ""

wait
