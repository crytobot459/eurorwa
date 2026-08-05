# Bài đăng sẵn sàng — 2026-08-05

> Sinh tự động từ snapshot 2026-08-05. Copy-paste từng mục là đăng được.
> 📸 **Đính kèm ảnh (LinkedIn/X):** `visual.png` (cùng thư mục, chart 1200x630).

## X (Twitter)

Tokenized MMFs: $10.64B across 15 EU/US funds (2026-08-05)
🥇 USYC $3.01B
📈 Top yield: CETES 4.60% · USTBL 4.34% · SAFO 4.00%
🔄 7d: eurSAFO +3.70%
Onchain-verified daily: https://rwa-dashboard-gamma.vercel.app
#RWA #Tokenization #MoneyMarketFunds

---

## Reddit (r/tokenization)

**Title:** Tokenized money market funds: $10.64B across 15 EU/US funds (2026-08-05)

Live data, refreshed daily (onchain-verified — each snapshot is hashed + signed).

Top 5 by TVL:
| Ticker | TVL | APY | 7d | Holders |
|---|---|---|---|---|
| USYC | $3.01B | 3.19% | 0.04% | 38 |
| BUIDL | $2.67B | 3.38% | 2.54% | 114 |
| USDY | $2.12B | 3.49% | -0.04% | 15559 |
| eurSAFO | $933.8M | 2.53% | 3.70% | 7394 |
| EUTBL | $898.5M | 2.21% | -4.27% | 3824 |

Top yields: CETES 4.60%, USTBL 4.34%, SAFO 4.00%, UKTBL 3.57%, USDY 3.49%
Biggest 7d mover: eurSAFO +3.70%, EUTBL -4.27%

Dashboard: https://rwa-dashboard-gamma.vercel.app
Repo (attestation code): https://github.com/crytobot459/eurorwa

Happy to add funds I missed — suggestions welcome.

---

## LinkedIn

$10.64B is sitting in tokenized money market funds — and almost nobody can tell you exactly what's inside them.

I built a live dashboard to change that. Here's what the data says today, and the part I couldn't get from any other data provider.

THE NUMBERS (2026-08-05)

$10.64B across 15 EU + US funds:
• USYC (Circle) — $3.01B · yield 3.19%
• BUIDL (BlackRock) — $2.67B · yield 3.38%
• USDY (Ondo) — $2.12B · yield 3.49%
• eurSAFO (Spiko) — $933.8M · yield 2.53%
• EUTBL (Spiko) — $898.5M · yield 2.21%

Top yields today: CETES 4.60% · USTBL 4.34% · SAFO 4.00% · UKTBL 3.57% · USDY 3.49%

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
• Tx: https://sepolia.etherscan.io/tx/0x61afb801bb03f1e4de7c32ab42b7763cf1e40a734f25105ba5dc239c9a21a3f0
• Contract: 0xd482a715cdef4073593f4a3208abd328f6d71725
• Hash: 0xeb0ec687…

WHAT THE DATA SAYS RIGHT NOW

eurSAFO is the 7-day mover (+3.70%), while EUTBL cooled off (-4.27%). The rotation between EUR and USD funds is the story to watch.

Live dashboard: https://rwa-dashboard-gamma.vercel.app
Open source: https://github.com/crytobot459/eurorwa

What's the one fund you'd add to this list?

#RWA #Tokenization #FixedIncome #DigitalAssets #MoneyMarketFunds
