#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
bun run src/fetch.ts
bun run src/ingest.ts
