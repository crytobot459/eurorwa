# Research: RWA data + rwa.xyz API

> Sources: rwa.xyz (main site + docs), CoinDesk 04/08/2026. Updated: 2026-08-04.

## 1. Current RWA market (real numbers from rwa.xyz)

| Metric                   | Value     | Note           |
| ------------------------ | --------- | -------------- |
| Distributed Asset Value  | $37.38B   | ▲1.71% / 30d   |
| Represented Asset Value  | $419.71B  | ▲176.57% / 30d |
| Total Asset Holders      | 1,588,665 | ▲53.09% / 30d  |
| Total Stablecoin Value   | $295.85B  | ▲0.17%         |
| Total Stablecoin Holders | 280.57M   | ▲3.47%         |

**On 04/08/2026**: BlackRock opened **12 tokenized share classes** from 6 funds,
covering **$311B AUM in money market funds** across Europe (15 markets, UCITS-compliant),
partnering with JPMorgan Kinexys. The day before, BlackRock added 2 tokenized funds in the US.
The RWA market is growing **>200%/year, past $30B** (rwa.xyz). Citi: $5.5 trillion by 2030.

## 2. Existing EU funds (rwa.xyz data — non-US govt debt)

| Ticker | TVL     | 1d change |
| ------ | ------- | --------- |
| EUTBL  | $898.5M | -4.27%    |
| NRW1   | $115.1M | +1.06%    |
| CAMMF  | $91.4M  | +0.21%    |
| AICRT  | $72.7M  | +0.02%    |
| CRMBR  | $31.3M  | +0.01%    |
| AICHT  | $26.0M  | +0.02%    |
| UKTBL  | $18.5M  | -0.59%    |
| bC3M   | $10.0M  | +1.55%    |
| CETES  | $5.4M   | +0.77%    |
| CRMFR  | $4.9M   | +15.29%   |

**Key observation**: current EU funds are all VERY SMALL (largest EUTBL ~$900M)
compared to BlackRock's just-opened $311B. This is exactly the **data gap** — the market just
exploded but there's no tracking data yet. Our dashboard fills that gap.

## 3. rwa.xyz API — how to use

### Main endpoint

```
GET https://api.rwa.xyz/v4/assets
Header: Authorization: Bearer $RWA_API_KEY
```

### Sample query (top 3 assets by market value)

```bash
curl -G 'https://api.rwa.xyz/v4/assets' \
  -H "Authorization: Bearer $RWA_API_KEY" \
  --data-urlencode 'query={
    "sort": {"field": "circulating_market_value_dollar", "direction": "desc"},
    "pagination": {"page": 1, "perPage": 3}
  }'
```

### Returned fields (~200 fields/asset)

- `circulating_market_value_dollar`: `{val, val_7d, val_30d, chg_7d_pct}`
- `asset_class_name`, `issuer_name`, `network_names`, `token_count`
- Separate endpoints: issuers, managers, networks, platforms, tokens, transactions

### API key

- Register at **app.rwa.xyz** → API Tools → API Keys
- If no access: email team@rwa.xyz
- Full docs: https://docs.rwa.xyz/llms.txt (index)

### MCP server (for AI)

- URL: `https://mcp.rwa.xyz`, OAuth 2.0
- Currently only supports Claude. Useful for research, not for production code.

## 4. Etherscan API (free, 5 req/s)

- Get ERC-20 balance/supply: `https://api.etherscan.io/api?module=account&action=tokenbalance...`
- Needs a free API key (etherscan.io → API keys). Used to cross-check onchain supply
  of tokens: BUIDL, EURC, USYC, USDY, EUTBL.

## 5. Data gap (why this project exists)

1. **Europe lacks data**: EU funds are small, nobody covers them; the $311B just exploded
2. **No portfolio tracker**: rwa.xyz is an aggregate registry, no wallet input
3. **No alerts**: no warning for unusual inflow/outflow
4. **Doesn't track RWA as DeFi collateral** (new RWA perps trend)
5. **No yield marketplace** ("where to park $10K for the best return")

## 6. Further learning resources

- https://docs.rwa.xyz/methodology/overview.md — how yield/NAV is computed
- https://docs.rwa.xyz/api/examples.md — endpoint examples
- https://docs.rwa.xyz/schemas/assets.md — full field reference
