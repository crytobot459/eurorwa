#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
bun run src/fetch.ts
bun run src/ingest.ts
if bun run src/agent/guard.ts; then
  bun run src/agent/attest.ts
  bun run src/agent/publish.ts
fi
run_step() {
  if [ -f .env.local ]; then
    bun --env-file=.env.local run "$1" || echo "[$(date -Iseconds)] $1 FAILED" >> data/cron.log
  elif [ -n "$LLM_BASE_URL" ]; then
    bun run "$1" || echo "[$(date -Iseconds)] $1 FAILED" >> data/cron.log
  fi
}
run_step src/analyst/index.ts
run_step scripts/alerts.ts
bun run src/posts.ts
bun run src/visual.ts
