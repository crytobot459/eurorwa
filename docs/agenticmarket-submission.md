# AgenticMarket — EuroRWA submission (2026-08-06)

> Nộp tại https://agenticmarket.dev/dashboard/submit sau khi tạo account (email verify).
> Sau approve (24h): copy proxy secret `am_server_…` → set `AGENTICMARKET_SECRET` trên Vercel → redeploy.
> Code `api/_mcp.js` đã có sẵn check header `x-agenticmarket-secret` (chỉ active khi env set).

## Form fields

| Field            | Value                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------- |
| Name             | `eurorwa`                                                                             |
| Description      | EuroRWA analyst: tokenized money-market fund signals, snapshots, analytics and alerts |
| Long description | (markdown dưới đây)                                                                   |
| MCP server URL   | `https://rwa-dashboard-gamma.vercel.app/mcp`                                          |
| Category         | Finance / Data                                                                        |
| Price per call   | `3` cents (tối thiểu $0.03)                                                           |
| Visibility       | Listed                                                                                |

## Long description (dán vào form)

```markdown
# EuroRWA Analyst

Live, on-chain-verifiable data for tokenized money market funds (RWA). The server exposes the same pipeline behind the EuroRWA dashboard: a daily snapshot of 15 EU + US funds where every number is hashed (keccak-256), signed by an agent wallet and published to a smart contract on Sepolia — so you can verify the data independently instead of trusting a dashboard.

## Tools

| Tool        | Returns                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overview`  | The latest analyst report — BUY/HOLD/SELL signal per fund with reasons, market view, crypto brief and on-chain brief, plus the attestation proof (hash, signer, Sepolia tx). |
| `funds`     | Latest snapshot of the 15 tracked funds — TVL, 7-day change, yield, holders, supply and integrity checks, sorted by TVL.                                                     |
| `analytics` | Institutional metrics — total TVL, concentration (top3/5/10, HHI), yield breadth and spread, currency / chain / issuer splits, holders and flows.                            |
| `alerts`    | Latest operational alerts — yield breakouts, yield cohort changes, TVL spikes, holder surges, macro regime flips.                                                            |

## Resources

| URI                        | Contents                               |
| -------------------------- | -------------------------------------- |
| `eurorwa://analyst/latest` | The most recent analyst report (JSON). |
| `eurorwa://funds/latest`   | The most recent fund snapshot (JSON).  |

## Why it's different

- **Every number is verifiable on-chain** — each snapshot is hashed and signed, and the hash is published to a Sepolia contract. Re-hash the data and check the signature yourself.
- **Runs unattended** — an AI agent scrapes, computes, signs and drafts the report every 12 hours.
- **EU focus** — 15 EU + US money market funds including USYC, BUIDL, USDY, eurSAFO, EUTBL.

Live dashboard: https://rwa-dashboard-gamma.vercel.app
Open source: https://github.com/crytobot459/eurorwa
```
