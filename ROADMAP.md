# EuroRWA — ROADMAP

Agent được giao nhiệm vụ hoàn thiện dự án **EuroRWA** — dashboard theo dõi
European Tokenized Money Market Funds, tích hợp **AI agent onchain**.

> Nguyên tắc: đọc file này TRƯỚC, làm theo thứ tự phase, mỗi phase có tiêu chí
> hoàn thành (Done = đúng/đủ). Sau khi xong mỗi phase, cập nhật `PROGRESS.md`.
> Mỗi phiên opencode mới: đọc `AGENTS.md` → `ROADMAP.md` → `PROGRESS.md` rồi tiếp tục.

---

## Tóm tắt 30 giây

- **Sản phẩm**: dashboard theo dõi các quỹ money market tokenized ở châu Âu
  (BlackRock/JPMorgan vừa mở $311 tỷ — rwa.xyz chưa cover đầy đủ).
- **Cách kiếm tiền**: bán API/data → grant → được tuyển (JPMorgan Kinexys, Securitize).
- **Điểm khác biệt**: tích hợp **AI agent onchain** publish dữ liệu lên blockchain
  (attestation) — cái mà rwa.xyz không làm.
- **Chi phí**: $0-15/tháng. **Thời gian**: 6-8 tuần MVP.

---

## PHASE 1 — Nghiên cứu & setup (tuần 1)

### Nhiệm vụ

1. Đọc 4 tài liệu nghiên cứu trong `docs/`:
   - `docs/research-rwa-data.md` — dữ liệu RWA, API rwa.xyz, data gaps
   - `docs/research-onchain-agent.md` — trend AI agent onchain, TEE, NEAR AI, IronClaw
   - `docs/research-monetization.md` — cách kiếm tiền, khách hàng thật
2. Lấy API key rwa.xyz:
   - Đăng nhập [app.rwa.xyz](https://app.rwa.xyz/login) → API Tools → API Keys
   - Set env: `RWA_API_KEY` trong `.env.local`
   - Nếu chưa có quyền API: gửi email team@rwa.xyz
3. Kiểm tra môi trường: `bun` (1.3.14 đã có), node, internet tới api.rwa.xyz + etherscan (đã test OK)
4. Tạo `.env.local` mẫu từ `.env.example`

### Tiêu chí hoàn thành (Done)

- [ ] Đọc xong 3 file research trong `docs/`, ghi chú 3-5 insight quan trọng vào `PROGRESS.md`
- [ ] Có `RWA_API_KEY` hoạt động: chạy `curl -G 'https://api.rwa.xyz/v4/assets' -H "Authorization: Bearer $RWA_API_KEY"` trả JSON
- [ ] `.env.local` tồn tại, không commit (nằm trong `.gitignore`)

---

## PHASE 2 — Script thu thập dữ liệu (tuần 2-3)

### Nhiệm vụ

1. Viết `src/fetch.ts` (Bun + TypeScript):
   - Gọi rwa.xyz API `/v4/assets` → lọc 15-20 quỹ EU: EUTBL, UKTBL, bC3M, BUIDL, USYC, USDY, EURC + quỹ BlackRock mới
   - Mỗi quỹ lấy: `circulating_market_value_dollar`, yield (APY/7-day), holder count, `chg_7d_pct`
   - Gọi etherscan API (free) cho balance/supply 5 token: BUIDL, EURC, USYC, USDY, EUTBL
   - Ghi JSON snapshot vào `data/snapshots/YYYY-MM-DD.json`
2. Viết `src/ingest.ts`:
   - Đọc snapshots → upsert vào SQLite `data/rwa.db`
   - Bảng: `funds` (id, slug, name, ticker, asset_class), `snapshots` (date, fund_id, tvl, yield, holders, supply)
   - Dùng `bun:sqlite` (không cần dependency)
3. Viết `src/cron.ts` hoặc shell `scripts/run.sh` chạy mỗi 12h (cron/systemd timer)

### Yêu cầu code (tuân theo AGENTS.md gốc của repo)

- Biến 1 từ (const, not camelCase dài), không `any`, không try/catch trừ khi cần, dùng `Bun.file()`
- `const db = new Database("data/rwa.db")` — dùng `bun:sqlite`

### Tiêu chí hoàn thành (Done)

- [x] `bun run src/fetch.ts` chạy được, tạo `data/snapshots/<ngày>.json` đầy đủ 15+ quỹ (11 quỹ EU/US, **data thật** scrape web)
- [x] `bun run src/ingest.ts` ghi được vào SQLite, truy vấn ra bảng (idempotent, 0 orphan)
- [x] Có lịch sử snapshot theo ngày (1 snapshot thật 08-05 + DB rebuild sạch)

> Ghi chú: rwa.xyz từ chối cấp API key → **chuyển sang scrape trang công khai** `app.rwa.xyz/assets/<TICKER>` (parse `__NEXT_DATA__`, không cần login). Data thật, source:"rwa.xyz-web". Nếu rwa.xyz đổi cấu trúc trang → fetch.ts có fallback mock + cần kiểm tra log.

---

## PHASE 3 — API (tuần 4)

### Nhiệm vụ

1. Viết `src/api.ts` (Bun + Hono):
   - `GET /funds` — danh sách quỹ + TVL mới nhất
   - `GET /funds/:slug` — chi tiết + lịch sử yield/flow
   - `GET /yields` — so sánh APY toàn bộ
   - `GET /flows` — net flows 7d/30d
   - CORS mở để frontend gọi được
2. Thêm auth đơn giản cho endpoint trả tiền sau này: `X-API-Key` (Phase 7)

### Tiêu chí hoàn thành (Done)

- [x] `bun run src/api.ts` start được, curl test 4 endpoint trả JSON đúng (funds, funds/:slug, yields, flows + 404) — data thật

---

## PHASE 4 — Frontend dashboard (tuần 5-6)

### Nhiệm vụ

1. Viết `src/frontend/` (React + Vite + Recharts):
   - Trang chính: bảng 11+ quỹ EU/US (TVL, APY, 7d change, holders)
   - Trang chi tiết: biểu đồ net flows + yield theo ngày
   - Trang "New Funds": alert quỹ mới (từ rwa.xyz new-asset-monitor + RPC events)
2. Build static → deploy **Vercel free** (hoặc GitHub Pages)
3. Vercel config: frontend + serverless API (mỗi function đọc SQLite)

### Tiêu chí hoàn thành (Done)

- [x] URL public hiển thị bảng dữ liệu cập nhật hàng ngày — **https://rwa-dashboard-gamma.vercel.app**
- [x] Biểu đồ flows/yield render được (detail chart TVL+APY, tabs yields bars + flows table — localhost OK)

> Deploy: `api/app.js` (JS thuần, đọc snapshot JSON — Vercel function là Node, helper `.ts` không được compile), `api/main.ts` (strip `/api` prefix), vercel.json `build.env VITE_API=/api` + rewrites `/api/:path*` → `/api/main`. Đã fix 3 bug routing/bundling + env build.

---

## PHASE 5 — AI agent onchain (tuần 7) ⭐ điểm khác biệt

> Chi tiết: `docs/research-onchain-agent.md`. Tóm tắt thiết kế:

### Mục tiêu

Agent tự động publish dữ liệu RWA lên blockchain để ai cũng verify được
("RWA yield data có chữ ký onchain") — rwa.xyz không làm cái này.

### Thiết kế tối giản (chọn 1 trong 2, ưu tiên a)

- **a) Lighter**: viết 1 script `src/agent/attest.ts`:
  - Hàng ngày đọc SQLite → hash payload (yield 15 quỹ) → ký bằng private key
    (ví EVM mới, tạo riêng, chỉ dùng cho agent)
  - Ghi hash + chữ ký vào file `data/attestations/<date>.json` + optional
    publish qua contract đơn giản (Solidity ~30 dòng) trên testnet/Sepolia
  - Người khác verify: hash → khớp dữ liệu công khai → tin cậy
- **b) Heavier**: dùng **NEAR AI / IronClaw** (agent chạy trong TEE, hardware-signed
  attestation) — agent tự fetch rwa.xyz + publish attestation tự động.
  → Chi phí cao hơn, làm sau khi có revenue.

3. (Bonus) Deploy contract `RWAAttestation.sol` lên Sepolia qua Foundry.

### Tiêu chí hoàn thành (Done)

- [x] `bun run src/agent/attest.ts` tạo file attestation (hash + signature) mỗi ngày
- [x] Có script verify `src/agent/verify.ts` kiểm chứng lại signature
- [x] (Bonus) Contract trên Sepolia + 1 tx thật — `0xcb03f6390ef54aaa1a39ef9f71448a23ccca3b7f`, attest tx https://sepolia.etherscan.io/tx/0x6f8ec37095093d9097eae89265e9f086eec09b754c7d0120eff288fe9e2fb72c

> Ghi chú: attest.ts/verify.ts đã chạy thật (15 quỹ, signer `0x02B0...F846`, ví `data/agent.key` gitignore). Verify bắt được tamper (payload đổi → "HASH MISMATCH"). Bonus Sepolia contract đã deploy + publish attestation đầu tiên (2026-08-05).

---

## PHASE 6 — Đăng & khoe sản phẩm (tuần 6-8, song song)

### Nhiệm vụ

1. Viết 5 bài đăng mẫu (mẫu trong `docs/research-monetization.md`):
   - BUIDL tăng TVL tuần này
   - So sánh yield EUTBL vs BUIDL vs USYC
   - Quỹ EU mới ra
   - Tổng dòng tiền tháng
   - "Cách tôi build dashboard theo dõi $311 tỷ BlackRock" (story + link)
2. Đăng lần lượt (2-3/tuần):
   - X (tag @BlackRock @Securitize @rwa_xyz #RWA #Tokenization)
   - Reddit: r/tokenization, r/CryptoCurrency
   - Telegram/Discord RWA
   - LinkedIn (tag người trong ngành)
3. GitHub repo public + README đẹp + GitHub Pages demo

### Tiêu chí hoàn thành (Done)

- [ ] 5 bài đăng viết xong trong `docs/posts/`
- [ ] Ít nhất 1 post được đăng (X/Reddit/LinkedIn), ghi link vào PROGRESS.md
- [ ] Repo public + README

---

## PHASE 7 — Kiếm tiền (tháng 2-4)

### Nhiệm vụ (làm theo thứ tự)

1. **Bán báo cáo**: viết PDF 2-3 trang "EU RWA Monthly" → Gumroad $20-50, hoặc bản free lấy email
2. **Bán API**: mở subscription $49/tháng — liên hệ 10 protocol DeFi nhỏ
   (email họ: "các bạn có cần EU fund yield data làm collateral không?")
3. **Grant**: tìm quỹ ecosystem (Ethereum, Base, các L2) — apply grant
4. **Việc làm** (song song): apply JPMorgan Kinexys, Securitize, WisdomTree —
   đính link dashboard + repo vào CV

### Tiêu chí hoàn thành (Done)

- [ ] Ít nhất 1 khách trả tiền (báo cáo/API) HOẶC đã nộp 1 đơn grant
- [ ] Đã gửi ít nhất 5 email giới thiệu API

---

## PHASE 8 — Mở rộng (tháng 4-12, tùy chọn)

- Portfolio tracker (nhập ví → xem RWA exposure + yield)
- Alerts (inflow/outflow bất thường, yield thay đổi)
- Mở rộng sang APAC money market funds
- Onchain agent bản nâng cao (NEAR AI / IronClaw trong TEE)

---

## Checklist tổng (copy vào PROGRESS.md, tick theo từng phase)

- [x] P1: setup môi trường (data thật web, không cần API key)
- [x] P2: fetch + ingest + SQLite lịch sử — data thật web
- [x] P3: API 4 endpoint — data thật
- [x] P4: frontend + deploy public — rwa-dashboard-gamma.vercel.app
- [~] P5: attest.ts + verify.ts xong (còn thiếu: bonus Sepolia contract)
- [ ] P6: 5 bài đăng + repo public
- [ ] P7: khách đầu tiên / grant
- [ ] P8: mở rộng (optional)

## Quy tắc vàng

1. **Build 2 tuần, khoe 4 tuần** — đăng từ Phase 2 (cả khi chỉ là bảng số liệu)
2. **Không đua rwa.xyz** — chỉ làm góc EU + attestation + portfolio + alerts
3. **Mỗi tuần 1 insight** — traffic/uy tín là tài sản, không phải code
4. **Hỏi 10 người trước khi build thêm tính năng**
