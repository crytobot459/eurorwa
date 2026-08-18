# EuroRWA — ROADMAP

EuroRWA is an **open research project** that tracks European and US tokenized
money-market funds and publishes an on-chain attestation so the data can be
independently verified. It is free to use and contains no advertising or paid
product.

> Compliance note: there is **no public web dashboard**. Per Vietnamese law
> (prohibition on crypto/coin advertising and registration, effective 1 Sep 2026)
> the project is distributed as open research code only.

---

## 30-second summary

- **What**: a dataset + pipeline tracking tokenized money-market funds (BUIDL, USYC, USDY, EUTBL, EURC, …)
- **Differentiator**: an on-chain AI agent that hashes + signs each snapshot (Sepolia) so anyone can verify it
- **Cost**: $0–15/month · **License**: open / free to fork

---

## PHASE 1 — Research & setup

### Tasks

1. Read the research documents in `docs/`:
   - `docs/research-rwa-data.md` — RWA data, rwa.xyz pages, data gaps
   - `docs/research-onchain-agent.md` — AI agent onchain trend, TEE, NEAR AI
2. Create `.env.local` from `.env.example` (all fields optional)

### Completion criteria

- [x] Environment works (`bun` present, can reach rwa.xyz public pages + etherscan)
- [x] `.env.local` exists, not committed (in `.gitignore`)

---

## PHASE 2 — Data collection (done)

- `src/fetch.ts` reads public rwa.xyz fund pages + etherscan supply → `data/snapshots/<date>.json`
- `src/ingest.ts` upserts into SQLite `data/rwa.db`
- `scripts/run.sh` runs the pipeline on a schedule

### Completion criteria

- [x] `bun run src/fetch.ts` produces a snapshot with 15+ funds
- [x] `bun run src/ingest.ts` writes to SQLite, idempotent

---

## PHASE 3 — API (done)

- `src/api.ts` (Hono): `/funds`, `/funds/:slug`, `/yields`, `/flows`, `/overview`, `/analytics`, `/history`, `/alerts`, `/verification`, `/rotation`, `/strategy`, `/portfolio`, `/analyst`
- Open CORS. All endpoints are **free and open** — no API key required.

### Completion criteria

- [x] `bun run src/api.ts` starts; endpoints return correct JSON

---

## PHASE 4 — Frontend dashboard (removed)

> The public web dashboard was removed to comply with Vietnamese law (no crypto/coin advertising or registration). The data pipeline, on-chain attestation, API and MCP server remain.

---

## PHASE 5 — On-chain attestation (done) ⭐

`src/agent/attest.ts` reads the snapshot → hashes the payload → signs with a
local EVM wallet (`data/agent.key`, gitignored) → writes `data/attestations/<date>.json`
and optionally publishes via `RWAAttestation.sol` on Sepolia. `src/agent/verify.ts`
validates the signature (catches tampering).

### Completion criteria

- [x] attestation file (hash + signature) produced daily
- [x] verify script validates the signature
- [x] Sepolia contract deployed + first attestation published

---

## PHASE 6 — Optional research extensions

- Portfolio tracker (enter wallet → view RWA exposure + yield)
- Alerts (unusual inflow/outflow, yield changes)
- Expand to APAC money-market funds
- Advanced on-chain agent (NEAR AI / IronClaw in TEE)

---

## Master checklist

- [x] P1: environment setup
- [x] P2: fetch + ingest + SQLite history
- [x] P3: API endpoints
- [x] P4: frontend removed (VN crypto-ad law)
- [x] P5: attest.ts + verify.ts + Sepolia contract
- [ ] P6: optional extensions
