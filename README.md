# EuroRWA — Research Project

> Independent research into **public data transparency and verifiable snapshots** for tokenized money-market funds (MMFs).

This repository is a **research project**. It studies how publicly available tokenized-MMF data can be collected, stored, and independently verified. It is provided as code and methodology for studying open financial data — not a product, service, or offering, and no hosted service, dashboard, or bot is operated here.

## Research questions

- How can a daily fund snapshot be made **independently verifiable** (keccak-256 hash → signed → published on-chain)?
- What does public tokenized-MMF data look like across EU + US issuers (TVL, yield, flows, holders)?
- Can an analyst layer produce **reproducible, explainable** signals from that data?

## What the code does

1. **Collect** public fund data (rwa.xyz) → SQLite snapshots.
2. **Attest** each snapshot: hash it (keccak-256), sign with a dedicated key, and publish the signature to a Sepolia contract.
3. **Analyze**: deterministic scoring plus an analyst layer over news / on-chain flows / macro context.
4. **Verify**: anyone can re-hash the data and check the on-chain signature.

## Components

| Component            | Path            |
| -------------------- | --------------- |
| Snapshot collector   | `src/fetch.ts`  |
| Store (SQLite)       | `src/ingest.ts` |
| Analyst              | `src/analyst/`  |
| On-chain attestation | `src/agent/`    |
| API (REST + MCP)     | `api/`          |
| Pipeline scripts     | `scripts/`      |

## Verify an attestation

```bash
bun run verify            # latest snapshot
bun run verify -- 2026-08-06   # a specific date
```

Verifies the payload hash matches the published keccak-256 and that the recovered signer is the agent wallet.

## Status

Research code, provided as-is for study. No hosted service is operated.

MIT © 2026 — data sourced from rwa.xyz public APIs. Not financial advice.
