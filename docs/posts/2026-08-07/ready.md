# Bài đăng sẵn sàng — 2026-08-07

> Sinh tự động từ snapshot 2026-08-07. Copy-paste từng mục là đăng được.
> 📸 **Đính kèm ảnh (LinkedIn/X):** `visual.png` (cùng thư mục, chart 1200x630).

## X (Twitter)

Tokenized MMFs: $10.71B across 15 EU/US funds (2026-08-07)
🥇 USYC $3.00B
📈 Top yield: CETES 4.60% · SAFO 4.04% · UKTBL 3.78%
🔄 7d: eurSAFO +7.28%
Onchain-verified daily: https://rwa-dashboard-gamma.vercel.app
#RWA #Tokenization #MoneyMarketFunds

---

## Reddit (r/tokenization)

**Title:** Tokenized money market funds: $10.71B across 15 EU/US funds (2026-08-07)

Live data, refreshed daily (onchain-verified — each snapshot is hashed + signed).

Top 5 by TVL:
| Ticker | TVL | APY | 7d | Holders |
|---|---|---|---|---|
| USYC | $3.00B | 3.18% | -0.05% | 37 |
| BUIDL | $2.70B | 3.43% | 0.83% | 114 |
| USDY | $2.12B | 3.49% | -0.25% | 15604 |
| eurSAFO | $989.7M | 2.56% | 7.28% | 7651 |
| EUTBL | $919.3M | 2.11% | 0.59% | 3844 |

Top yields: CETES 4.60%, SAFO 4.04%, UKTBL 3.78%, USDY 3.49%, USTBL 3.48%
Biggest 7d mover: eurSAFO +7.28%, SAFO -8.97%

What the numbers mean: $7.82B (~73%) is in just 3 funds. Yields span 2.49 points (2.11% → 4.60%). USDY has 15,604 holders vs 114 for BUIDL.

Dashboard: https://rwa-dashboard-gamma.vercel.app
Repo (attestation code): https://github.com/crytobot459/eurorwa

Happy to add funds I missed — suggestions welcome.

---

## LinkedIn

$10.71B is sitting in tokenized money market funds — and almost nobody can tell you exactly what's inside them.

I built a live dashboard to change that. Here's what the data says today, and the part I couldn't get from any other data provider.

THE NUMBERS (2026-08-07)

$10.71B across 15 EU + US funds:
• USYC (Circle) — $3.00B · yield 3.18%
• BUIDL (BlackRock) — $2.70B · yield 3.43%
• USDY (Ondo) — $2.12B · yield 3.49%
• eurSAFO (Spiko) — $989.7M · yield 2.56%
• EUTBL (Spiko) — $919.3M · yield 2.11%

Top yields today: CETES 4.60% · SAFO 4.04% · UKTBL 3.78% · USDY 3.49% · USTBL 3.48%

WHAT THE NUMBERS MEAN

• $7.82B — 73% of the total — sits in just 3 funds (USYC, BUIDL, USDY). The market is consolidating behind the biggest issuers, fast.
• Yield on offer runs from 2.11% to 4.60% — a 2.49-point gap for the same "park cash safely" trade. Which treasury you pick is now a real decision.
• USDY counts 15,604 holders; BUIDL counts 114. Same asset class, two worlds: retail wallets vs institutions parking billions.
• eurSAFO is the 7-day mover (+7.28%), while SAFO cooled off (-8.97%). Capital is rotating, not leaving the asset class.

WHY THIS MATTERS

Tokenized treasuries are quietly becoming the "risk-free rate on-chain." BlackRock, Circle and Ondo are pulling in billions — paying daily yield, settling 24/7. For corporate treasuries and DeFi alike, this is becoming the default place to park cash.

THE PART I COULDN'T GET ANYWHERE ELSE

No one sits and updates a spreadsheet. My AI agent runs the whole pipeline on its own every 12 hours:

• Scrapes public data across 15 EU + US money market funds
• Computes TVL, yields and 7-day flows
• Hashes every snapshot (keccak-256) and signs it with its own wallet
• Publishes the hash to a smart contract on Sepolia — public, permanent, tamper-proof
• Drafts this very post

I review, hit publish, and open-source the code. Anyone can re-hash the data and verify the on-chain signature. No "trust me bro" dashboards.

Live proof for this snapshot (Sepolia):
• Tx: https://sepolia.etherscan.io/tx/0xc71804deacdffced42096948c3ffbfb77450c2b3ec553c0db585a96eede7d506
• Contract: 0xd482a715cdef4073593f4a3208abd328f6d71725
• Hash: 0x0e75510a…

WHAT THE DATA SAYS RIGHT NOW

eurSAFO is the 7-day mover (+7.28%), while SAFO cooled off (-8.97%). The rotation between EUR and USD funds is the story to watch.

Live dashboard: https://rwa-dashboard-gamma.vercel.app
Open source: https://github.com/crytobot459/eurorwa

What's the one fund you'd add to this list?

#RWA #Tokenization #FixedIncome #DigitalAssets #MoneyMarketFunds
