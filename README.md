<p align="center">
  <img src="data/linkedin/logo.png" alt="EuroRWA" width="380">
</p>

<h1 align="center">EuroRWA</h1>

<p align="center">
  <b>Tokenized money market funds — on-chain verifiable.</b><br>
  An AI agent pipeline that snapshots EU + US tokenized money market funds, signs every snapshot on-chain, and drafts the daily report.
</p>

<p align="center">
  <a href="https://rwa-dashboard-gamma.vercel.app">Live dashboard</a> ·
  <a href="https://sepolia.etherscan.io/address/0xd482a715cdef4073593f4a3208abd328f6d71725">On-chain attestation</a> ·
  <a href="https://registry.modelcontextprotocol.io/servers?search=eurorwa">MCP Registry</a>
</p>

---

## What it does

Every 12 hours, the system:

1. **Scrapes** public data across 15 EU + US tokenized money market funds — USYC, BUIDL, USDY, eurSAFO, EUTBL and more.
2. **Computes** TVL, APY, holders, and 7 / 30 / 90-day flows into a SQLite snapshot.
3. **Signs** each snapshot — hashed with keccak-256 and published to a smart contract on **Sepolia**, permanent and tamper-proof.
4. **Analyzes** with an AI agent (BUY / HOLD / SELL) using news, on-chain flows, and macro context.
5. **Delivers** the daily report summary to Telegram.

Anyone can re-hash the data and verify the on-chain signature — no "trust me" dashboards.

## Interfaces

| Interface   | How to use                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Dashboard   | https://rwa-dashboard-gamma.vercel.app — charts for TVL, yields, flows, holders                 |
| Open API    | `GET /api/overview`, `/api/funds`, `/api/yields`, `/api/flows`, `/api/analytics`, `/api/alerts` |
| Paid report | `POST /api/analyst` — pay-per-call via x402 ($0.05 USDC on Base)                                |
| MCP server  | Streamable HTTP at `/mcp` — 4 tools + 2 resources, published on the MCP Registry                |
| Telegram    | @EuroRWA_Data_bot for data · @EuroRWA_Build_2026_bot for build commissions                      |

## Stack

| Layer    | Tech                              |
| -------- | --------------------------------- |
| Runtime  | TypeScript · Bun                  |
| On-chain | Viem · Solidity · Sepolia · Base  |
| Data     | SQLite · rwa.xyz API              |
| API      | Hono · x402 · CDP facilitator     |
| Frontend | React · Vite · Recharts           |
| AI       | Google Gemini                     |
| Bots     | Telegram (long-polling + webhook) |

## Repo layout

```
src/fetch.ts          # snapshot scraper (rwa.xyz)
src/ingest.ts         # snapshot → SQLite
src/analyst/          # AI agent: news / flow / macro + BUY-HOLD-SELL
src/agent/            # on-chain attestation (deploy / sign / verify / publish)
src/frontend/         # dashboard web app
api/                  # Hono API (REST + x402 + MCP) + Telegram bot entrypoints
scripts/              # cron pipeline, settlement, LinkedIn assets, NFT mint
data/                 # snapshots, agent wallet, attestation store
docs/                 # LinkedIn guide, monetization research, posts
```

## Verify an attestation

```bash
bun run verify            # latest snapshot
bun run verify -- 2026-08-06   # a specific date
```

Verifies the payload hash matches the published keccak-256 and that the recovered signer is the EuroRWA agent wallet.

## Status

- [x] Data pipeline (15 funds, 12h cadence, trend columns)
- [x] On-chain attestation on Sepolia
- [x] AI analyst with 30/90d trend awareness
- [x] Telegram delivery
- [x] Live dashboard + on-chain verified NFT avatar
- [x] Pay-per-call report API (x402 v2, CDP facilitator settlement)
- [x] MCP server published on the MCP Registry
- [ ] Public Telegram data bot (in progress)

---

## Contact

- Telegram data bot: https://t.me/EuroRWA_Data_bot
- Telegram build bot (commissions): https://t.me/EuroRWA_Build_2026_bot

MIT © 2026 — data sourced from rwa.xyz public APIs. Not financial advice.
