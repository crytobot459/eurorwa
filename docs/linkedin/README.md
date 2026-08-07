# LinkedIn — Profile + Posts (2026-08-06)

> Profile: https://www.linkedin.com/in/canh-pham-bot-dev/
> Images in this folder: `avatar.png` (profile picture 400×400) · `banner.png` (cover 1584×396) · `logo.png` (logo 900×280, for brand kit / posts)
> All 3 images have **no name, no face, no numbers** — the avatar is an abstract data-network logo (network graph), banner/logo only carry the "EuroRWA" brand.

---

## 0.5. WHERE DOES THE LOGO GO? ✅

`logo.png` is **NOT for LinkedIn** (LinkedIn already has avatar + banner). The logo is used elsewhere:

- GitHub repo `eurorwa` → README header
- Website dashboard → footer / header
- Telegram bot → bot avatar, description
- Posts / newsletters / slides / email signature
- Docs pages, vercel.json branding

> Fixed: previously the logo had a transparent background but white text → text disappeared on light backgrounds. Now it has a dark card → works on both white and dark backgrounds.

---

## 0.7. TELEGRAM FOR CUSTOMERS ✅

2 Telegram bots (already exist):

- **@EuroRWA_Data_bot** — public data bot (customers ask for numbers, view dashboard)
- **@EuroRWA_Build_2026_bot** — task/commission bot (customers get quoted, pay USDT 100% upfront)

**On LinkedIn — add to Contact info → Websites:**

- Website 1 (Portfolio): `https://rwa-dashboard-gamma.vercel.app`
- Website 2 (Telegram): `https://t.me/EuroRWA_Build_2026_bot` (customer clicks → enters the task bot)

**On the web dashboard:** added a **💬 Telegram** button in the header → opens @EuroRWA_Data_bot (deployed).

> ✅ **Updated (2026-08-06):** the task bot (freelance-core.js + freelance-bot.js) is now **fully in English** — international customers from LinkedIn understand it immediately. Added:
>
> - **Lead triage:** auto-classifies messages → `opportunity` (recruiters) / `task` (commission) / `spam`.
> - **Flow A:** recruiter messages are NOT auto-replied — the bot sends a suggested draft (from `data/templates.json`) to the owner, who approves via `/send <chatId>` or writes their own via `/draft <chatId> <text>`, then it goes to the customer.
> - **Flow B:** after delivery, the owner types `/deliver <taskId> <description/path>` → bot sends the completion notice to the customer; customer replies "ok" → task closed, or gives feedback → back to review status.

---

## 0.6. PROFILE REVIEW — LEARNING FROM THE BEST 🎯

> Checked 2026-08-06: new content being applied step by step (images + headline done). Note: LinkedIn blocks bots so I **can't view the live profile** — search engines still cache the old headline _"Machine Learning Engineer | Algorithmic Trading | Rust, Python"_. After editing, verify on your own account (not saved until you enter it).

### Real name or fake name? → REAL NAME REQUIRED ⚠️

LinkedIn **forbids fake names / nicknames / brand names** in the name field (User Agreement + Professional Community Policies). Using a fake name = account locked/restricted. A **"preferred professional name"** (shorter version of your real name) is allowed.
→ **Keep the name "Canh Pham"**, put the "EuroRWA" brand into the **headline, About, Experience, Featured** — exactly how the best profiles do it (see below).

### What do the good profiles do? (model after them)

4 in-demand RWA/DeFi profiles:

- **moazam abbasi** — headline packed with keywords: `Smart Contract Engineer | DeFi Protocol Development | MEV and Flash Loan Systems | RWA Tokenization ERC-3643 | Solidity and Rust | Arbitrum...`; About = hook + "what I'm building" + stack; projects have METRICS ("$5M+", "sub-millisecond latency").
- **almardan isaev** — uses impressive numbers ("liquidated $5M+ positions, made $300K+"), writes posts sharing real experience.
- **devang patel (RWA.xyz)** — posts/reposts RWA news weekly → builds "authority".
- **joachim lebrun (creator ERC-3643)** — About clearly states he "builds infrastructure", roles, standards.

**Common thread:** real name · keyword-rich headline · About hook + numbers · complete Featured · keyword skills · consistent posts on RWA/tokenization topics · no off-topic emotional posts.

Standards extracted from in-demand RWA/DeFi dev profiles (moazam abbasi, almardan isaev, devang patel from RWA.xyz):

### Headline — pack keywords, max 220 chars

```
Bot Developer | On-chain RWA & DeFi data pipelines | AI agents + Telegram automation for tokenized money market funds
```

(Added "DeFi", "AI agents" to increase search keywords vs the old version.)

### About — the opening line must "hook" (only ~3 lines visible before "see more")

Change the first line to:

```
I build small automated systems that turn public data into products people can verify — every number hashed & signed on-chain.
```

Then continue with the "Currently building EuroRWA..." paragraph as before. End the About with a clear CTA:

```
Open to work on RWA / tokenization data, DeFi analytics, and automation projects. DM me or email...
```

### Featured — ADD NOW, very important

Put 3 things in Featured to make the profile "alive":

1. Dashboard link: https://rwa-dashboard-gamma.vercel.app
2. GitHub link: https://github.com/crytobot459/eurorwa
3. `visual.png` image or the NFT link on Etherscan (on-chain proof)

### Skills — add keywords to be found

`RWA · Tokenization · On-chain Data · DeFi · Telegram Bot · AI Agents · Data Pipeline · TypeScript · Bun · SQLite · Viem · Google Gemini · Solidity · Ethereum · Sepolia · Web3 · Automation`

### Experience — bullets with METRICS

Current version is decent; add numbers: "15 funds · 12h cadence · 30/90-day flows", "every snapshot keccak-256 signed on Sepolia".

### Things to do on LinkedIn (manual)

1. Change the headline (paste above).
2. Paste the new About (hook + CTA).
3. Add 3 Featured items.
4. Delete/hide old emotional posts, or pin an RWA post.
5. Enable "Open to work" + fill in location (Ho Chi Minh City).
6. Post 1 new post with `visual.png` (section 5) — after posting, log the link in PROGRESS.md.

---

## 1. STEPS TO APPLY (2-3 minutes, done by hand)

1. **Profile picture:** profile → ✏️ → Photo → Upload → choose `avatar.png` (abstract logo, no face).
2. **Cover:** profile → ✏️ → Background photo → Upload → choose `banner.png` (EuroRWA brand only, no numbers).
3. **Separate logo (`logo.png`):** use in posts, website, signature — not a profile photo.
4. **Headline:** paste the line below (section 2).
5. **About section:** paste the content from section 3.
6. **Experience:** add 1 entry (section 4).
7. **Post:** create a new post → paste section 5 → attach `visual.png` (docs/posts/2026-08-06/).

---

## 0. NFT MINTED (2026-08-06) ✅

**Minted, 100% free (Sepolia):**

- **NFT:** EuroRWA Avatar #1 — image (SVG) stored directly **on-chain**, no IPFS needed
- **Contract:** `0x38d6c0c35da4288b6e34061e4e7b104135a7c1e0`
- **Owner:** your MetaMask wallet `0x55833f4B385528dF3c711741a2dEa404806fd0Da`
- **View:** https://sepolia.etherscan.io/token/0x38d6c0c35da4288b6e34061e4e7b104135a7c1e0

**View in MetaMask:** switch network to **Sepolia test network** → **NFT** tab → Import → enter the contract address + Token ID `1`.

**Move to Base mainnet (when you want a "real" NFT):** contact me — the wallet already has ~0.01 Sepolia ETH for transfer gas. Note this wallet only has **testnet** gas, so you'd need real ETH (Base) to mint/transfer on mainnet.

> ⚠️ This wallet's private key **was pasted in chat** → treat it as compromised. Don't deposit real funds. For safety, create a new wallet and move the NFT over later.

---

## 2. HEADLINE (paste directly)

```
Bot Developer | On-chain RWA & DeFi data pipelines | AI agents + Telegram automation for tokenized money market funds
```

---

## 3. ABOUT

```
I build small automated systems that turn public data into products people can verify — every number hashed & signed on-chain.

Currently building EuroRWA — an AI agent pipeline that snapshots 15 EU + US tokenized money market funds (USYC, BUIDL, USDY, eurSAFO, EUTBL…) every 12 hours, computes TVL / APY / holders / 7-30-90-day flows, runs a BUY/HOLD/SELL analyst, hashes and signs each snapshot on Sepolia, and drafts the daily report. Every number is on-chain verifiable — no "trust me" dashboards.

Also building Telegram bots that do real work: a public data bot for the dashboard and a freelance build bot with on-chain payment verification.

What I care about:
• Making boring data verifiable
• Automating workflows until they run unattended
• Small, reliable systems over big ones

Open to work on RWA / tokenization data, DeFi analytics, and automation projects. DM me here to chat.
```

---

## 4. EXPERIENCE (add 1 entry)

**Title:** Bot Developer — RWA Data & On-chain Verification
**Company:** Self-employed · Freelance
**Dates:** 2025 – Present
**Description:**

```
• Built an AI agent system monitoring 15 tokenized money market funds (USYC, BUIDL, USDY, eurSAFO…) — TVL, APY, holders, 7/30/90-day flows
• Every daily snapshot is hashed (keccak-256) and signed on Sepolia — anyone can verify
• Deployed 2 Telegram bots: public data bot (webhook) + freelance build bot (long-polling, on-chain payment verification)
• Tech: TypeScript, Bun, Viem, SQLite, Hono, Google Gemini, Docker
```

_(If you have earlier work experience, add it above.)_

---

## 5. POST (publish with the visual.png image)

> New version 2026-08-07 — rewritten following patterns from high-quality RWA/DeFi posts + 2026 data (hook <60 chars, real numbers, story, closing question, links in comments, 1-3 hashtags). The newest version always lives in `docs/posts/2026-08-06/ready.md`.

```
$10.7B is parked in tokenized money funds. Nobody publishes what's actually inside them.

So I built an AI agent that does — every 12 hours, every number on-chain verifiable.

Here's what it found that a weekly report would have missed:

THE NUMBERS (2026-08-06)

• USYC (Circle) — $3.00B · yield 3.19%
• BUIDL (BlackRock) — $2.68B · yield 3.38%
• USDY (Ondo) — $2.12B · yield 3.49%
• eurSAFO (Spiko) — $979M · yield 2.55%
• EUTBL (Spiko) — $911M · yield 2.16%

Top yields: CETES 4.60% · USTBL 4.12% · SAFO 4.02%

WHAT THE AGENT DOES EVERY 12 HOURS

1. Scrapes 15 EU + US money market funds
2. Computes TVL, yield, holders, and 7-day flows
3. Hashes each snapshot (keccak-256) and signs it with its own wallet
4. Publishes the hash to a smart contract on Sepolia — public, permanent, tamper-proof
5. Drafts this very post for me to review

That step 4 is the part I couldn't get from any data provider.

Anyone can re-hash the data, check the signature, and match the on-chain attestation. No "trust me bro" dashboards.

WHY THIS MATTERS

• $7.8B — 73% of the total — sits in just 3 funds. The market is consolidating behind the biggest issuers, fast.
• Yields run from 2.16% to 4.60% for the same "park cash safely" trade. Choosing a treasury is now a real decision.
• USDY counts 15,601 holders; BUIDL counts 114. Same asset class, two worlds — retail wallets vs institutions parking billions.
• eurSAFO is the 7-day mover (+6.8%) while UKTBL cooled off (-3.3%). Capital is rotating, not leaving the asset class.

Tokenized treasuries are quietly becoming the on-chain risk-free rate. I wanted to see that data live, not in a monthly report.

The dashboard and all the code are open source — links in the first comment.

Which fund would you add to this list?

#RWA #Tokenization #BuildingInPublic
```

**First comment** (paste right after posting — links NOT in the body):

```
Live dashboard: https://rwa-dashboard-gamma.vercel.app
On-chain proof (Sepolia tx): https://sepolia.etherscan.io/tx/0xb70f48ba50e5260e14a03740071feae8a800e9130e3aebccea01a00e6c2bbca0
Open source: https://github.com/crytobot459/eurorwa
```

---

## NOTES

- Avatar is an abstract data-network logo — no name, no face, unrelated to real identity.
- Profile is in English (LinkedIn is international). If you want bilingual, add a Vietnamese section at the end of About.
- After posting → log the post link in PROGRESS.md.
