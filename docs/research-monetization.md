# Research: How to make money from EuroRWA + post templates

> Updated: 2026-08-04. Serves Phase 6 (posting/showcasing) and Phase 7 (monetization).

## 1. Real customers (who will pay)

| Who needs it                       | What they buy                   | How much              |
| ---------------------------------- | ------------------------------- | --------------------- |
| EU DeFi protocols                  | EU yield data API as collateral | $50-200/month         |
| Family office / corporate treasury | Report + dedicated dashboard    | $200-500/project      |
| Small tokenization issuers         | Advertising + benchmark         | $100-300/month        |
| Journalists / research             | Exclusive data                  | Attribution = traffic |
| Recruiters                         | You (proof of work)             | $150K/year            |

## 2. 3 monetization stages

### Stage 1 (months 2-4): Reports + attention — $0-500/month

- Sell the "EU RWA Monthly" report (2-3 page PDF) via **Gumroad** $20-50,
  or a free version to collect emails
- Traffic + credibility → small issuers pay to feature their fund (sponsor $100-300/month)

### Stage 2 (months 4-8): Sell data/API — $200-1,000/month

- API subscription $49/month — 1-2 DeFi protocols using EU yield data
- Email 10 small DeFi protocols: "do you need EU fund yield data?"

### Stage 3 (months 8-12): Job / grant — $100K+/year

- JPMorgan Kinexys (currently building exactly this with BlackRock)
- Securitize (BUIDL issuer), WisdomTree, EU issuers
- Grants from ecosystem funds (Ethereum, Base, L2s)

## 3. Customer outreach (sample email)

```
Subject: EU tokenized money market yield data — we have an API

Hi [name],

We track tokenized money market funds in Europe
(BlackRock/JPMorgan just opened $311B — mostly not covered by anyone yet).
We have an API for daily yield/TVL/flow data, and every data point
has an onchain attestation (verifiable).

Pricing: $49/month for 5 funds, $149/month for everything.

Does your company need this kind of data?
```

## 4. Where to post & how (Phase 6)

### Channels (ordered by effectiveness)

1. **X (Twitter)** — #RWA #Tokenization #BUIDL #MoneyMarketFunds; tag @BlackRock @Securitize @rwa_xyz
2. **Reddit**: r/tokenization, r/CryptoCurrency, r/defi
3. **Telegram/Discord RWA** (search "RWA" in discord servers)
4. **GitHub** — public repo + nice README (= CV)
5. **LinkedIn** — tag tokenization industry people

### Posting schedule: 2-3 posts/week, each with 1 insight + screenshot

## 5. 5 SAMPLE POSTS (update numbers with real data when posting)

### Post 1 — Capital flowing into EU

> "BUIDL just grew X% TVL this week — European capital is shifting into
> tokenized money market funds. BlackRock's new $311B is pulling it in.
> Our dashboard tracks each fund daily: [link]"
>
> - chart

### Post 2 — Yield comparison

> "Same $10K: EUTBL 3.2% vs BUIDL 4.1% vs USYC 3.9% — what do you actually keep after fees?
> We compare real APYs across 15 EU funds, updated daily: [link]"
>
> - table

### Post 3 — New fund

> "A new EU tokenized fund just launched: [name]. TVL X in Y days.
> This is 1 of N funds we track. See the new funds monitor: [link]"

### Post 4 — Monthly summary

> "This month $X B flowed into EU onchain money market funds. Breakdown by fund:
> EUTBL, BUIDL, USYC... Full detail in the dashboard: [link]"

### Post 5 — Build story

> "How I built a dashboard tracking BlackRock's $311B tokenized funds:
>
> - Getting data from the rwa.xyz API + onchain balances
> - Snapshotting every 12h into SQLite
> - Every data point has an onchain signature (attestation) — anyone can verify
>   Source: [github link]"

## 6. Notes

- 1 insight per week — traffic/reputation is the main asset
- Don't race rwa.xyz — only do the EU angle + attestation + portfolio + alerts
- Ask 10 people before building new features

## 7. NEW (2026-08-07): How others actually make money — market data

Sources: CoinShares/Token Terminal Q2/26, Binance Research, RWA.xyz, RelayPlane, Cloudflare, Circle, CoinDesk. Summarized below.

### 7.1 The macro: RWA is the only growing corner of crypto

- **RWA deposits tripled to $7.4B in Q2/26** while total DeFi deposits fell ~15% (CoinShares/Token Terminal). Demand driven by real use cases, not market conditions.
- Tokenized asset market **$43B+** (Token Terminal, wider definition) / **$33B** (RWA.xyz) — 37% growth in 6 months. Funds = ~80% of it.
- RWA spot trading **+220% YoY** while overall DEX volume fell ~70% — tokenized assets are becoming _tradable_, not just held.
- **RWA perpetuals exploded**: $347B volume in May (1,472x from start of 2025), $4.5B daily OI, RWA perps = **31% of onchain perp volume** (was 1.3% at start of year). 24/7 markets beat TradFi futures for reacting to events (Iran conflict showed on Hyperliquid before CME reopened). Pre-IPO markets = new retail access.
- **Tokenized stocks doubled** ($951M Mar → $1.89B Jul): SECZ, FGRS, STRCx drove half the growth; Ondo + xStocks = 72.7% of distributed value. Caveat: most tokenized equities lack real legal rights (90%).
- Tokenized gold ($6B+) + yield-bearing stablecoins (Sky sUSDS, Ethena sUSDe) drive DEX RWA volume.
- DTCC tokenization service commercial rollout, Nasdaq same-CUSIP settlement, Standard Chartered initiates Uniswap coverage (UNI 40x by 2030 thesis, DeFi $2.7T).

**Implication for EuroRWA**: the story is shifting from "Treasury/MMF tokenization" to **"RWAs as tradeable, leveraged, perp-able assets."** The MMF-yield angle we track is the stable, collateral-grade slice. Reference the perps/stock boom in posts to ride the narrative.

### 7.2 The x402/agent-payment opportunity (numbers that matter)

- x402 protocol processed **172,270 tx/day ≈ $62,990/day** on 2026-03-11 (~$23M/yr run rate). 7x volume growth in 5 months.
- **Supply-demand gap: 477 sellers vs 4,400 buyers.** Demand is ~9x supply — a builder gap waiting to be filled.
- **76% of x402 services price at $0.10 or below** → our $0.05 `/api/analyst` price is in the volume sweet spot.
- **Virtuals Protocol ACP** (`acp-x402.virtuals.io`): 54,910 tx in 24h = $34,810/day, **only 2 sellers serving 3,700 buyers** — extreme demand concentration, seller side nearly empty. Register there.
- **LLM-proxy model** (blockrun.ai): accept USDC via x402, forward to GPT/Claude/Gemini, +5% margin. 6,770 tx/day, ~$25K/month. Buyers avoid managing 11 provider API keys.
- **MCP monetization**: `mcp-x402.vishwanetwork.xyz` = 18,670 tx/day at $0.01. Per-tool pricing inside MCP tool calls.
- **Data-wrapper model**: wrap free source (CoinGecko, Yahoo, scraping), charge $0.01–$0.25/call → $1,500–2,400/month at 1k req/day, ~$15/month infra. One dev built 3 APIs / 22 paid endpoints in days.
- **Cloudflare Monetization Gateway** (announced 2026-07-01): charge for pages/datasets/APIs/MCP tools via x402, waitlist open — **join the waitlist now, first-mover positioning**. Cloudflare Wallets (2026-08-04): programmable agent wallets, payments "coming soon" — design for it.
- **Circle Agent Stack**: Agent Wallets + Agent Marketplace (`agents.circle.com/services`) + Gateway nanopayments ($0.000001 min). Seller flow live on Arc Testnet.
- **DeFi yield on idle USDC**: Morpho Base vaults 4.5–7% APY — sweep revenue into yield instead of leaving it idle.

### 7.3 Concrete next actions for EuroRWA (ranked by effort vs. payoff)

1. **Register on Circle Agent Marketplace** (agents.circle.com/services) — discovery where Circle's agent-wallet buyers already shop. Free, no mainnet settlement required for listing.
2. **Join Cloudflare Monetization Gateway waitlist** — be early; it directly monetizes the exact MCP/API shape we already ship.
3. **Virtuals ACP registration** — 2 sellers / 3,700 buyers is the most under-served demand pool in the ecosystem.
4. **Add a paid MCP tool** (price per tool call ~$0.01–0.05) — MCP monetization already does 18k tx/day; we have `/mcp` infra. **DONE ✅ (2026-08-07)**: `overview` tool now charges $0.05 USDC via x402 (HTTP 402 challenge → verify → settle); free tools keep the agenticmarket secret gate.
5. **Ride the RWA-perps narrative in posts** — tag the $347B volume stat, Hyperliquid/tradeXYZ, pre-IPO markets to stay on-trend, while keeping our verifiable-MMF-data differentiation. Draft ready in `docs/posts/2026-08-07/rwa-perps.md`.
6. Keep testnet for now (per user decision) — mainnet switch unlocks x402scan + CDP Bazaar; the demand data above strengthens the case to fund mainnet wallets when ready.
