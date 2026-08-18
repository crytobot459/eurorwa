# AGENTS.md — EuroRWA (research)

Instructions for **every opencode session** working in this project.
Read this file FIRST, then `ROADMAP.md`.

## Mission

EuroRWA is a **research project**: it tracks European and US tokenized
money-market funds and publishes an on-chain attestation so the data can be
independently verified. There is no commercial, advertising, or paid product.

> Compliance note: this repository contains **no public web dashboard and no
> advertising**. Per Vietnamese law (prohibition on crypto/coin advertising and
> registration, effective 1 Sep 2026) the project is distributed as open,
> free-to-use research code only.

## Session start (required)

1. Read `ROADMAP.md`
2. Identify the in-progress phase, continue from there

## Working rules

- Follow the ROADMAP phase order
- Each phase has Done criteria — only move on after the checklist is ticked
- Cost $0–15/month — don't add paid dependencies/cloud without a reason
- All endpoints are **free and open** — no paywalls, no API keys required to read data

## Code conventions (inherited from repo root AGENTS.md)

- Single-word variables: `const db`, `const cfg` — no long `camelCase` unless truly needed
- No `any`
- Avoid try/catch unless needed
- Use Bun APIs: `Bun.file()`, `bun:sqlite`
- Prefer type inference, `const` over `let`, early return over `else`
- snake_case for DB columns

## Project structure

```
rwa-dashboard/
├── ROADMAP.md          # phase roadmap (read first)
├── AGENTS.md           # this file
├── docs/
│   ├── research-rwa-data.md       # RWA data research
│   └── research-onchain-agent.md  # AI agent onchain research
├── src/
│   ├── fetch.ts        # get data from rwa.xyz (public pages) + etherscan
│   ├── ingest.ts       # write into SQLite
│   ├── api.ts          # API endpoints
│   └── agent/
│       ├── attest.ts   # sign + publish onchain attestation
│       └── verify.ts   # verify signature
├── api/
│   ├── app.js          # data API (reads snapshot JSON)
│   ├── tg.ts           # Telegram webhook entry /api/tg
│   └── tgbot.js        # public bot Q&A (data assistant)
├── scripts/
│   ├── alerts.ts       # alert detection
│   └── run.sh          # daily pipeline
└── data/
    ├── snapshots/      # JSON per day
    ├── rwa.db          # SQLite
    └── attestations/   # hash + signature per day
```

## Main data sources

- **rwa.xyz**: public fund pages `https://app.rwa.xyz/assets/<TICKER>` (no login needed)
- **Etherscan API**: free, 5 req/s (optional `ETHERSCAN_API_KEY` raises the rate limit)
- **Key internal doc**: ROADMAP Phase 5 details how to do attestation

## Security notes

- `.env*` is gitignored; never commit secrets
- The attestation signer is an EVM wallet created locally (`data/agent.key`,
  gitignored) — used only for signing, never funded
- `.gitignore` must include: `.env*`, `data/rwa.db`, `data/attestations/`, `data/snapshots/`
