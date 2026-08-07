# EuroRWA Analyst — SKILL.md

EuroRWA tracks tokenized money-market funds (RWA) listed on rwa.xyz, plus the
broader crypto and on-chain market. Every day it produces an analyst report that
is hashed (keccak-256), signed (EIP-191), and attested on-chain (Sepolia), so the
data can be verified independently.

## Paid endpoint

- `POST https://rwa-dashboard-gamma.vercel.app/api/analyst`
- Price: `$0.05` (USDC 6 decimals = `50000` atomic units) on **Base** (`eip155:8453`)
- PayTo: `0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846`
- Payment: x402 v2 (`PAYMENT-SIGNATURE` header, EIP-712 `TransferWithAuthorization`)
- Body is empty. Response is the latest report (JSON).

## Calling pattern

1. `POST /api/analyst` with no payment → server answers `402` with a
   `PAYMENT-REQUIRED` header (base64 JSON) describing the accepted payment.
2. Sign the EIP-712 `TransferWithAuthorization` typed data with the caller's
   wallet (USDC contract on Base, `balanceOf(caller) >= 50000` required).
3. Resend `POST /api/analyst` with the `PAYMENT-SIGNATURE` header
   (base64 JSON of `{ x402Version: 2, accepted, payload: { signature, authorization } }`).
4. Server verifies signature + balance, settles on-chain, returns `200` with the
   report body and a `PAYMENT-RESPONSE` header.

## Report shape

```json
{
  "date": "2026-08-06",
  "generated_at": "2026-08-06T09:08:40.386Z",
  "market_view": "…",
  "crypto_view": "Regime: …\nRotation: …\nWhat to watch: …",
  "chain_view": "Liquidity: …\nActivity: …\nWatch: …",
  "signals": [{ "ticker": "USYC", "action": "HOLD", "confidence": "medium", "reasons": ["…"] }],
  "hash": "0x…",
  "signer": "0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846",
  "signature": "0x…",
  "attestation": { "key": "2026-08-06-analyst-2", "tx": "0x…", "block": 11430480, "hash": "0x…", "signer": "0x…" }
}
```

## Open data endpoints

- `GET /api/overview` — report summary + verification status
- `GET /api/funds` — per-fund table (TVL, NAV, integrity checks)
- `GET /api/yields` — yield ranking
- `GET /api/flows` — day-over-day flows
- `GET /api/analytics` — institutional metrics (concentration, breadth, chains, issuers)
- `GET /api/alerts` — recent alerts (yield breakouts, TVL spikes, regime flips)
- Live dashboard: https://rwa-dashboard-gamma.vercel.app
