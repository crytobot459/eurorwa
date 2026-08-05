#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
bun run src/fetch.ts
bun run src/ingest.ts
if bun run src/agent/guard.ts; then
  bun run src/agent/attest.ts
  bun run src/agent/publish.ts
fi
bun run src/posts.ts
bun run src/visual.ts
