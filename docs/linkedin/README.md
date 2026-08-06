# LinkedIn — Hồ sơ + Bài đăng (2026-08-06)

> Hồ sơ: https://www.linkedin.com/in/canh-pham-bot-dev/
> Ảnh trong thư mục này: `avatar.png` (ảnh đại diện 400×400) · `banner.png` (ảnh bìa 1584×396) · `logo.png` (logo 900×280, dùng cho brand kit / bài viết)
> Cả 3 ảnh **không có tên, không có mặt, không có số liệu** — avatar là logo mạng dữ liệu trừu tượng (network graph), banner/logo chỉ có thương hiệu "EuroRWA".

---

## 0.5. LOGO ĐỂ ĐÂU? ✅

`logo.png` **KHÔNG dùng cho LinkedIn** (LinkedIn đã có avatar + banner). Logo dùng ở nơi khác:

- GitHub repo `eurorwa` → README header
- Website dashboard → footer / header
- Telegram bot → ảnh đại diện bot, mô tả
- Bài viết / bản tin / slides / chữ ký email
- Trang docs, vercel.json branding

> Đã sửa: trước đây logo nền trong suốt nhưng chữ trắng → mất chữ trên nền sáng. Giờ có thẻ nền tối (card) → dùng được trên nền trắng lẫn tối.

---

## 0.6. ĐÁNH GIÁ HỒ SƠ — HỌC TỪ NGƯỜI GIỎI 🎯

> Kiểm tra 2026-08-06: bộ nội dung mới đang được áp dụng từng bước (ảnh + headline đã làm). Lưu ý: LinkedIn chặn bot nên tôi **không xem được hồ sơ live** — search engine vẫn còn cache headline cũ _"Machine Learning Engineer | Algorithmic Trading | Rust, Python"_. Sau khi sửa, kiểm tra trên chính tài khoản của bạn (chưa vào thì chưa lưu).

### Tên thật hay tên giả? → BẮT BUỘC tên thật ⚠️

LinkedIn **cấm tên giả / biệt danh / tên thương hiệu** trong ô tên (User Agreement + Professional Community Policies). Dùng tên giả = tài khoản bị khoá/restrict. Được phép dùng **"preferred professional name"** (tên gọn hơn của tên thật).
→ **Giữ tên "Canh Pham"**, đưa thương hiệu "EuroRWA" vào **headline, About, Experience, Featured** — đúng như cách người giỏi làm (xem dưới đây).

### Các hồ sơ giỏi làm sao? (học theo)

4 hồ sơ RWA/DeFi được săn đón:

- **moazam abbasi** — headline nhét từ khoá: `Smart Contract Engineer | DeFi Protocol Development | MEV and Flash Loan Systems | RWA Tokenization ERC-3643 | Solidity and Rust | Arbitrum...`; About = hook + "what I'm building" + stack; dự án có SỐ đo ("$5M+", "sub-millisecond latency").
- **almardan isaev** — dùng con số ấn tượng ("liquidated $5M+ positions, made $300K+"), viết bài chia sẻ trải nghiệm thật.
- **devang patel (RWA.xyz)** — đăng/tái chia sẻ tin RWA mỗi tuần → tạo "authority".
- **joachim lebrun (creator ERC-3643)** — About kể rõ mình "build infrastructure", vai trò, chuẩn.

**Điểm chung:** tên thật · headline giàu từ khoá · About hook + số liệu · Featured đầy đủ · kỹ năng liệt kê keyword · đăng bài đều về đúng chủ đề RWA/tokenization · không có bài đăng cảm xúc lạc chủ đề.

Chuẩn rút ra từ hồ sơ các dev RWA/DeFi được săn đón (moazam abbasi, almardan isaev, devang patel của RWA.xyz):

### Headline — nhét từ khoá, tối đa 220 ký tự

```
Bot Developer | On-chain RWA & DeFi data pipelines | AI agents + Telegram automation for tokenized money market funds
```

(Thêm "DeFi", "AI agents" để tăng từ khoá tìm kiếm so với bản cũ.)

### About — câu mở đầu phải "hook" (chỉ ~3 dòng hiển thị trước "see more")

Đổi dòng đầu tiên thành:

```
I build small automated systems that turn public data into products people can verify — every number hashed & signed on-chain.
```

Rồi mới tiếp đoạn "Currently building EuroRWA..." như cũ. Cuối About thêm CTA rõ:

```
Open to work on RWA / tokenization data, DeFi analytics, and automation projects. DM me or email...
```

### Featured (mục nổi bật) — THÊM ngay, rất quan trọng

Đưa 3 thứ lên Featured để hồ sơ "sống":

1. Link dashboard: https://rwa-dashboard-gamma.vercel.app
2. Link GitHub: https://github.com/crytobot459/eurorwa
3. Ảnh `visual.png` hoặc link NFT trên Etherscan (minh chứng on-chain)

### Kỹ năng (Skills) — thêm từ khoá để được tìm thấy

`RWA · Tokenization · On-chain Data · DeFi · Telegram Bot · AI Agents · Data Pipeline · TypeScript · Bun · SQLite · Viem · Google Gemini · Solidity · Ethereum · Sepolia · Web3 · Automation`

### Kinh nghiệm — bullet có SỐ đo

Bản hiện tại đã khá tốt; thêm số: "15 funds · 12h cadence · 30/90-day flows", "every snapshot keccak-256 signed on Sepolia".

### Việc cần làm trên LinkedIn (thủ công)

1. Đổi headline (dán ở trên).
2. Dán lại About mới (hook + CTA).
3. Thêm 3 mục Featured.
4. Xoá/ẩn bài đăng cũ kiểu cảm xúc, hoặc ghim bài RWA.
5. Bật "Open to work" + điền location (Ho Chi Minh City).
6. Đăng 1 bài mới kèm `visual.png` (mục 5) — đăng xong ghi link vào PROGRESS.md.

---

## 1. CÁC BƯỚC ÁP DỤNG (2-3 phút, làm bằng tay)

1. **Ảnh đại diện:** vào hồ sơ → ✏️ → Ảnh → Tải lên → chọn `avatar.png` (logo trừu tượng, không mặt).
2. **Ảnh bìa:** hồ sơ → ✏️ → Ảnh nền → Tải lên → chọn `banner.png` (chỉ thương hiệu EuroRWA, không số liệu).
3. **Logo riêng (`logo.png`):** dùng trong bài viết, trang web, chữ ký — không phải ảnh hồ sơ.
4. **Headline:** dán dòng bên dưới (mục 2).
5. **Phần Giới thiệu (About):** dán nội dung mục 3.
6. **Kinh nghiệm:** thêm 1 mục (mục 4).
7. **Đăng bài:** tạo bài đăng mới → dán mục 5 → đính kèm ảnh `visual.png` (docs/posts/2026-08-06/).

---

## 0. NFT ĐÃ MINT (2026-08-06) ✅

**Đã mint xong, 100% miễn phí (Sepolia):**

- **NFT:** EuroRWA Avatar #1 — ảnh (SVG) nằm thẳng **trên chuỗi**, không cần IPFS
- **Hợp đồng:** `0x38d6c0c35da4288b6e34061e4e7b104135a7c1e0`
- **Chủ sở hữu:** ví MetaMask của bạn `0x55833f4B385528dF3c711741a2dEa404806fd0Da`
- **Xem:** https://sepolia.etherscan.io/token/0x38d6c0c35da4288b6e34061e4e7b104135a7c1e0

**Xem trong MetaMask:** đổi mạng sang **Sepolia test network** → tab **NFT** → Import → nhập địa chỉ hợp đồng + Token ID `1`.

**Chuyển sang Base mainnet (khi muốn NFT "thật"):** liên hệ tôi — ví đã có sẵn ~0.01 Sepolia ETH để trả gas chuyển NFT. Lưu ý ví này có gas tiền **testnet** nên cần nạp ETH thật (Base) nếu muốn mint/chuyển trên mainnet.

> ⚠️ Khóa riêng tư của ví này **đã bị dán trong chat** → coi là đã lộ. Không nạp tiền thật vào. Muốn an toàn thì tạo ví mới và chuyển NFT sang sau.

---

## 2. HEADLINE (dán thẳng)

```
Bot Developer | On-chain RWA & DeFi data pipelines | AI agents + Telegram automation for tokenized money market funds
```

---

## 3. GIỚI THIỆU (About)

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

## 4. KINH NGHIỆM (thêm 1 mục)

**Vị trí:** Bot Developer — RWA Data & On-chain Verification
**Công ty:** Self-employed · Freelance
**Thời gian:** 2025 – Hiện tại
**Mô tả:**

```
• Built an AI agent system monitoring 15 tokenized money market funds (USYC, BUIDL, USDY, eurSAFO…) — TVL, APY, holders, 7/30/90-day flows
• Every daily snapshot is hashed (keccak-256) and signed on Sepolia — anyone can verify
• Deployed 2 Telegram bots: public data bot (webhook) + freelance build bot (long-polling, on-chain payment verification)
• Tech: TypeScript, Bun, Viem, SQLite, Hono, Google Gemini, Docker
```

_(Nếu có kinh nghiệm làm việc trước đây thì thêm lên phía trên.)_

---

## 5. BÀI ĐĂNG (đăng kèm ảnh visual.png)

> $10.67B is sitting in tokenized money market funds — and almost nobody can tell you exactly what's inside them.
>
> I built a live dashboard to change that.
>
> THE NUMBERS (2026-08-06)
> • USYC (Circle) — $3.00B · yield 3.19%
> • BUIDL (BlackRock) — $2.67B · yield 3.38%
> • USDY (Ondo) — $2.12B · yield 3.49%
> • eurSAFO (Spiko) — $963.5M · yield 2.54%
> • EUTBL (Spiko) — $903.3M · yield 2.13%
>
> Top yields: CETES 4.60% · USTBL 4.32% · SAFO 4.01%
>
> THE PART I COULDN'T GET ANYWHERE ELSE
> No one sits and updates a spreadsheet. My AI agent runs the whole pipeline itself every 12 hours:
> • Scrapes public data across 15 EU + US money market funds
> • Computes TVL, yields and flows
> • Hashes every snapshot and signs it with its own wallet
> • Publishes the hash to a smart contract on Sepolia — public, permanent, tamper-proof
> • Drafts this very post
>
> Anyone can re-hash the data and verify the on-chain signature. No "trust me bro" dashboards.
>
> Live dashboard: https://rwa-dashboard-gamma.vercel.app
> Open source: https://github.com/crytobot459/eurorwa
>
> What's the one fund you'd add to this list?
>
> #RWA #Tokenization #FixedIncome #DigitalAssets #MoneyMarketFunds

---

## GHI CHÚ

- Avatar là logo mạng dữ liệu trừu tượng — không tên, không mặt, không liên quan danh tính thật.
- Hồ sơ bằng tiếng Anh (LinkedIn quốc tế). Nếu muốn song ngữ, thêm phần tiếng Việt ở cuối About.
- Sau khi đăng xong → ghi link bài vào PROGRESS.md.
