#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
bun run src/fetch.ts
bun run src/ingest.ts
bun run src/agent/attest.ts
bun run src/agent/publish.ts
bun run src/posts.ts
bun run src/visual.ts
