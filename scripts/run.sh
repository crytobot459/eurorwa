#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
bun run src/fetch.ts
bun run src/ingest.ts
if bun run src/agent/guard.ts; then
  bun run src/agent/attest.ts
  bun run src/agent/publish.ts
fi
if [ -f .env.local ]; then
  bun --env-file=.env.local run src/analyst/index.ts || echo "[$(date -Iseconds)] analyst FAILED" >> data/cron.log
fi
if [ -f .env.local ]; then
  bun --env-file=.env.local run scripts/alerts.ts || echo "[$(date -Iseconds)] alerts FAILED" >> data/cron.log
fi
bun run src/posts.ts
bun run src/visual.ts
