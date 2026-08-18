> ⚠️ **Archived / Decommissioned.** The public web dashboard and all coin advertising/registration have been removed to comply with Vietnamese law (prohibition on crypto/coin advertising and registration, effective 1 Sep 2026). This repository is kept as an archived technical reference. The data pipeline, on-chain attestation, API and MCP server code remain; no hosted service or public bot is operated.

## What it was

A data pipeline that snapshots EU + US tokenized money-market-fund data (rwa.xyz), computes TVL / APY / holder counts / flows into SQLite, and publishes a keccak-256 hash of each snapshot to an on-chain attestation contract on Sepolia. An AI analyst layer produced BUY / HOLD / SELL signals from news, on-chain flows and macro context.

Anyone can re-hash the data and verify the on-chain signature — no "trust me" dashboards.

## Components (code only — no hosted service)

| Component            | Path            |
| -------------------- | --------------- |
| Snapshot scraper     | `src/fetch.ts`  |
| Ingest → SQLite      | `src/ingest.ts` |
| AI analyst           | `src/analyst/`  |
| On-chain attestation | `src/agent/`    |
| API (REST + MCP)     | `api/`          |
| Pipeline scripts     | `scripts/`      |

## Verify an attestation

```bash
bun run verify            # latest snapshot
bun run verify -- 2026-08-06   # a specific date
```

Verifies the payload hash matches the published keccak-256 and that the recovered signer is the agent wallet.

MIT © 2026 — data sourced from rwa.xyz public APIs. Not financial advice.
