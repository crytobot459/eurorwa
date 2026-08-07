# 5 bài đăng mẫu — EuroRWA

> Data thật snapshot 2026-08-05 (15 quỹ, tổng $10.6B). Link: https://rwa-dashboard-gamma.vercel.app
> Repo: https://github.com/crytobot459/eurorwa
> Đăng 2-3 bài/tuần, mỗi bài 1 insight + kèm screenshot. Sau khi đăng, ghi link vào PROGRESS.md.

---

## Bài 1 — Dòng tiền chảy vào EU (X + LinkedIn)

**X:**

> Tokenized money market funds just passed **$10.6B** across the 15 funds I track — and the biggest is no longer US-only. USYC (Ondo) is now at **$3.0B**, BUIDL (BlackRock) at $2.7B, USDY $2.1B.
>
> The EU corner is the interesting one: eurSAFO $934M, EUTBL $898M and climbing. European treasuries onchain are quietly becoming the safe-haven trade of tokenization.
>
> I track every fund's TVL + APY daily, with an onchain attestation so each number is verifiable:
> https://rwa-dashboard-gamma.vercel.app
>
> #RWA #Tokenization #Defi @rwa_xyz @BlackRock

**LinkedIn (mở rộng 2-3 câu):**

> Tokenized money market funds have crossed $10.6B in TVL across the 15 largest EU + US funds. The shift that stands out: USYC (Ondo) leading at $3.0B, while European funds (eurSAFO, EUTBL) are compounding fast as treasuries go onchain. We're snapshotting all 15 funds daily and signing every data point onchain — anyone can verify the numbers. Dashboard + source on my GitHub. #RWA #Tokenization

---

## Bài 2 — So sánh yield (X + Reddit r/tokenization)

**X:**

> Where would you park $10K today?
>
> - USTBL (Spiko US T-Bills): **4.34%**
> - CETES (Mexico, onchain): **4.60%**
> - SAFO: **4.00%** | UKTBL: **3.57%** | USDY: **3.49%**
> - BUIDL (BlackRock): **3.38%** | USYC (Ondo): **3.19%** | EUTBL: **2.21%**
>
> Same asset class, big spread in APY — and fees change the real number. I compare live APYs of 15 EU/US money-market funds, refreshed daily:
> https://rwa-dashboard-gamma.vercel.app
>
> #RWA #Yield #MoneyMarketFunds

**Reddit (r/tokenization, post):**

> Title: "Live comparison of 15 tokenized money market funds (USYC, BUIDL, EUTBL, USTBL) — APY spread is wider than you think"
> Body: I built a small dashboard tracking 15 EU + US tokenized MMFs daily. Current 7-day APYs: USTBL 4.34%, SAFO 4.00%, BUIDL 3.38%, USYC 3.19%, EUTBL 2.21%. Data is scraped from public sources, hashed + signed onchain each day so anyone can verify. Dashboard: https://rwa-dashboard-gamma.vercel.app — repo: https://github.com/crytobot459/eurorwa. Happy to add funds if I missed a notable one.

---

## Bài 3 — Quỹ mới gia nhập WATCH list (X)

**X:**

> I track 15 tokenized money market funds now — just added:
>
> - **USTBL** — Spiko US T-Bills, already $146M (highest APY on my board at 4.34%)
> - **AAULF** — abrdn Liquidity Fund Lux USD, $16M
> - **bIB01** — Backed IBTA $ Treasury 0-1yr, $12M
> - **EUROB** — Etherfuse Eurobond
>
> Every entry has live TVL, APY and holder count. Monitor: https://rwa-dashboard-gamma.vercel.app
>
> #RWA #Tokenization #FixedIncome

---

## Bài 4 — Tổng kết (X + LinkedIn, đăng cuối tháng)

**X:**

> EU + US tokenized money market funds: **$10.6B** across 15 funds.
>
> Top by TVL: USYC $3.0B · BUIDL $2.7B · USDY $2.1B · eurSAFO $934M · EUTBL $898M
>
> Top by yield: USTBL 4.34% · CETES 4.60% · SAFO 4.00% · UKTBL 3.57% · USDY 3.49%
>
> Full breakdown + history: https://rwa-dashboard-gamma.vercel.app
>
> #RWA #Defi #Ethereum

---

## Bài 5 — Câu chuyện build (LinkedIn + X thread)

**LinkedIn:**

> How I built a dashboard tracking $10.6B of tokenized money market funds in a weekend:
>
> 1. Data — pull TVL / APY / holder counts of 15 EU + US funds from public pages into SQLite
> 2. API — 4 endpoints (funds, yields, fund detail with history, flows)
> 3. Onchain attestation — every daily snapshot is keccak256-hashed, signed by an agent wallet, and verifiable on-chain. No more "trust me bro" dashboards.
> 4. Deploy — Vite + Hono on Vercel, edge-consistent worldwide
>
> Live: https://rwa-dashboard-gamma.vercel.app
> Code: https://github.com/crytobot459/eurorwa
>
> Next: Sepolia contract publishing the attestation hash per day, so the verifiability is public and permanent.
>
> If you build in RWA / tokenized treasuries, I'd love feedback.

**X (thread version):**

> Thread: I built a dashboard that tracks 15 tokenized money market funds ($10.6B TVL) and signs every data point onchain 🧵
>
> 1/ Why: rwa.xyz is great but I wanted EU focus + verifiable data. Data from public sources → SQLite, refreshed daily.
> 2/ The twist: each daily snapshot is hashed (keccak256) + signed by an agent wallet. Anyone can verify the numbers aren't tampered with.
> 3/ Deployed on Vercel — CI/CD from GitHub, redeployed on every pipeline commit.
> Live: https://rwa-dashboard-gamma.vercel.app · Code: https://github.com/crytobot459/eurorwa
>
> Feedback welcome. #buildinpublic #RWA
