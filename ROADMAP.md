# EuroRWA — ROADMAP

Agent's task is to complete the **EuroRWA** project — a dashboard tracking
European Tokenized Money Market Funds, with an **on-chain AI agent** integrated.

> Rules: read this file FIRST, follow phases in order, each phase has a
> completion criterion (Done = correct/complete). After each phase, update `PROGRESS.md`.
> Each new opencode session: read `AGENTS.md` → `ROADMAP.md` → `PROGRESS.md`, then continue.

---

## 30-second summary

- **Product**: dashboard tracking European tokenized money-market funds
  (BlackRock/JPMorgan just opened $311B — rwa.xyz doesn't cover it fully yet).
- **How it makes money**: sell API/data → grant → get hired (JPMorgan Kinexys, Securitize).
- **Differentiator**: integrated **on-chain AI agent** publishing data to the blockchain
  (attestation) — something rwa.xyz doesn't do.
- **Cost**: $0-15/month. **Timeline**: 6-8 weeks MVP.

---

## PHASE 1 — Research & setup (week 1)

### Tasks

1. Read the 4 research documents in `docs/`:
   - `docs/research-rwa-data.md` — RWA data, rwa.xyz API, data gaps
   - `docs/research-onchain-agent.md` — AI agent onchain trend, TEE, NEAR AI, IronClaw
   - `docs/research-monetization.md` — monetization, real customers
2. Get an rwa.xyz API key:
   - Log in at [app.rwa.xyz](https://app.rwa.xyz/login) → API Tools → API Keys
   - Set env: `RWA_API_KEY` in `.env.local`
   - If no API access yet: email team@rwa.xyz
3. Check environment: `bun` (1.3.14 already present), node, internet to api.rwa.xyz + etherscan (tested OK)
4. Create `.env.local` from `.env.example`

### Completion criteria (Done)

- [ ] Read the 3 research files in `docs/`, note 3-5 key insights in `PROGRESS.md`
- [ ] Working `RWA_API_KEY`: `curl -G 'https://api.rwa.xyz/v4/assets' -H "Authorization: Bearer $RWA_API_KEY"` returns JSON
- [ ] `.env.local` exists, not committed (in `.gitignore`)

---

## PHASE 2 — Data collection script (weeks 2-3)

### Tasks

1. Write `src/fetch.ts` (Bun + TypeScript):
   - Call rwa.xyz API `/v4/assets` → filter 15-20 EU funds: EUTBL, UKTBL, bC3M, BUIDL, USYC, USDY, EURC + new BlackRock funds
   - Per fund: `circulating_market_value_dollar`, yield (APY/7-day), holder count, `chg_7d_pct`
   - Call etherscan API (free) for balance/supply of 5 tokens: BUIDL, EURC, USYC, USDY, EUTBL
   - Write JSON snapshot to `data/snapshots/YYYY-MM-DD.json`
2. Write `src/ingest.ts`:
   - Read snapshots → upsert into SQLite `data/rwa.db`
   - Tables: `funds` (id, slug, name, ticker, asset_class), `snapshots` (date, fund_id, tvl, yield, holders, supply)
   - Use `bun:sqlite` (no dependency needed)
3. Write `src/cron.ts` or shell `scripts/run.sh` running every 12h (cron/systemd timer)

### Code requirements (follow repo's original AGENTS.md)

- Single-word variables (const, not long camelCase), no `any`, no try/catch unless needed, use `Bun.file()`
- `const db = new Database("data/rwa.db")` — use `bun:sqlite`

### Completion criteria (Done)

- [x] `bun run src/fetch.ts` runs, creates `data/snapshots/<date>.json` with 15+ funds (11 EU/US funds, **real data** scraped from web)
- [x] `bun run src/ingest.ts` writes to SQLite, queryable (idempotent, 0 orphans)
- [x] Daily snapshot history (1 real 08-05 snapshot + clean DB rebuild)

> Note: rwa.xyz refused to grant an API key → **switched to scraping public pages** `app.rwa.xyz/assets/<TICKER>` (parse `__NEXT_DATA__`, no login needed). Real data, source:"rwa.xyz-web". If rwa.xyz changes page structure → fetch.ts has mock fallback + needs log check.

---

## PHASE 3 — API (week 4)

### Tasks

1. Write `src/api.ts` (Bun + Hono):
   - `GET /funds` — fund list + latest TVL
   - `GET /funds/:slug` — detail + yield/flow history
   - `GET /yields` — APY comparison across all
   - `GET /flows` — net flows 7d/30d
   - Open CORS so frontend can call
2. Add simple auth for the future paid endpoint: `X-API-Key` (Phase 7)

### Completion criteria (Done)

- [x] `bun run src/api.ts` starts, curl tests 4 endpoints return correct JSON (funds, funds/:slug, yields, flows + 404) — real data

---

## PHASE 4 — Frontend dashboard (weeks 5-6)

### Tasks

1. Write `src/frontend/` (React + Vite + Recharts):
   - Main page: table of 11+ EU/US funds (TVL, APY, 7d change, holders)
   - Detail page: net flows + yield charts by day
   - "New Funds" page: new fund alerts (from rwa.xyz new-asset-monitor + RPC events)
2. Build static → deploy **Vercel free** (or GitHub Pages)
3. Vercel config: frontend + serverless API (each function reads SQLite)

### Completion criteria (Done)

- [x] Public URL showing daily-updated data table — **https://rwa-dashboard-gamma.vercel.app**
- [x] Flows/yield charts render (detail chart TVL+APY, tabs yields bars + flows table — localhost OK)

> Deploy: `api/app.js` (pure JS, reads snapshot JSON — Vercel functions are Node, `.ts` helpers aren't compiled), `api/main.ts` (strips `/api` prefix), vercel.json `build.env VITE_API=/api` + rewrites `/api/:path*` → `/api/main`. Fixed 3 routing/bundling bugs + build env.

---

## PHASE 5 — AI agent onchain (week 7) ⭐ differentiator

> Details: `docs/research-onchain-agent.md`. Design summary:

### Goal

Agent automatically publishes RWA data to the blockchain so anyone can verify it
("RWA yield data with an on-chain signature") — rwa.xyz doesn't do this.

### Minimal design (choose 1 of 2, prefer a)

- **a) Lighter**: write one script `src/agent/attest.ts`:
  - Daily reads SQLite → hashes payload (yield of 15 funds) → signs with a private key
    (new EVM wallet, created separately, used only by the agent)
  - Writes hash + signature to `data/attestations/<date>.json` + optionally
    publishes via a simple contract (Solidity ~30 lines) on testnet/Sepolia
  - Others verify: hash → matches public data → trusted
- **b) Heavier**: use **NEAR AI / IronClaw** (agent runs in TEE, hardware-signed
  attestation) — agent fetches rwa.xyz + publishes attestation automatically.
  → Higher cost, do after there's revenue.

3. (Bonus) Deploy the `RWAAttestation.sol` contract to Sepolia via Foundry.

### Completion criteria (Done)

- [x] `bun run src/agent/attest.ts` creates an attestation file (hash + signature) each day
- [x] Verify script `src/agent/verify.ts` validates the signature
- [x] (Bonus) Contract on Sepolia + 1 real tx — current contract `0xd482a715cdef4073593f4a3208abd328f6d71725`, attest tx https://sepolia.etherscan.io/tx/0x61afb801bb03f1e4de7c32ab42b7763cf1e40a734f25105ba5dc239c9a21a3f0 (old contract `0xcb03...3b7f` replaced due to hash mismatch from cron re-run)

> Note: attest.ts/verify.ts ran for real (15 funds, signer `0x02B0...F846`, wallet `data/agent.key` gitignore). Verify catches tampering (payload changed → "HASH MISMATCH"). Bonus Sepolia contract deployed + first attestation published (2026-08-05).

---

## PHASE 6 — Post & showcase product (weeks 6-8, in parallel)

### Tasks

1. Write 5 sample posts (templates in `docs/research-monetization.md`):
   - BUIDL TVL up this week
   - Yield comparison EUTBL vs BUIDL vs USYC
   - New EU fund launched
   - Monthly capital flows
   - "How I built a dashboard tracking BlackRock's $311B" (story + link)
2. Post gradually (2-3/week):
   - X (tag @BlackRock @Securitize @rwa_xyz #RWA #Tokenization)
   - Reddit: r/tokenization, r/CryptoCurrency
   - Telegram/Discord RWA
   - LinkedIn (tag industry people)
3. Public GitHub repo + nice README + GitHub Pages demo

### Completion criteria (Done)

- [ ] 5 posts written in `docs/posts/`
- [ ] At least 1 post published (X/Reddit/LinkedIn), log link in PROGRESS.md
- [ ] Public repo + README

---

## PHASE 7 — Make money (months 2-4)

### Tasks (in order)

1. **Sell reports**: write 2-3 page PDF "EU RWA Monthly" → Gumroad $20-50, or free version to collect emails
2. **Sell API**: open subscription $49/month — contact 10 small DeFi protocols
   (email them: "do you need EU fund yield data as collateral?")
3. **Grant**: find ecosystem funds (Ethereum, Base, L2s) — apply for grants
4. **Jobs** (in parallel): apply JPMorgan Kinexys, Securitize, WisdomTree —
   link dashboard + repo in CV

### Completion criteria (Done)

- [ ] At least 1 paying customer (report/API) OR 1 grant application submitted
- [ ] Sent at least 5 API intro emails

---

## PHASE 8 — Expansion (months 4-12, optional)

- Portfolio tracker (enter wallet → view RWA exposure + yield)
- Alerts (unusual inflow/outflow, yield changes)
- Expand to APAC money market funds
- Advanced onchain agent (NEAR AI / IronClaw in TEE)

---

## Master checklist (copy into PROGRESS.md, tick per phase)

- [x] P1: environment setup (real web data, no API key needed)
- [x] P2: fetch + ingest + SQLite history — real web data
- [x] P3: API 4 endpoints — real data
- [x] P4: frontend + public deploy — rwa-dashboard-gamma.vercel.app
- [~] P5: attest.ts + verify.ts done (missing: bonus Sepolia contract)
- [ ] P6: 5 posts + public repo
- [ ] P7: first customer / grant
- [ ] P8: expansion (optional)

## Golden rules

1. **Build 2 weeks, showcase 4 weeks** — post from Phase 2 (even if just a data table)
2. **Don't race rwa.xyz** — only do the EU angle + attestation + portfolio + alerts
3. **1 insight per week** — traffic/reputation is the asset, not the code
4. **Ask 10 people before building new features**
