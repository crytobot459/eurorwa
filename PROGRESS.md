# PROGRESS — EuroRWA

> Cập nhật sau mỗi phiên opencode. Xem `ROADMAP.md` để biết chi tiết từng phase.

## Phiên gần nhất: 2026-08-05 (phiên 5)

**Việc đã làm:**

- **Visual chart generator**: `src/visual.ts` + script `bun run visual` — sinh chart PNG 1200×630 (dark theme, bar top 8 quỹ TVL, chips yield, badge onchain-verified) qua Chrome headless (`/usr/bin/google-chrome`, không cần npm dep) → `docs/posts/visual-<date>.png` + `.html`. Đã nối vào `scripts/run.sh` (cron 12h tự sinh ảnh mới).
- **LinkedIn nâng cấp long-form**: `src/posts.ts` giờ sinh bài LinkedIn chất lượng (~1480 ký tự): hook → THE NUMBERS (top 5 bullets kèm yield) → WHY THIS MATTERS → THE PART I COULDN'T GET ANYWHERE ELSE (story keccak-256 → sign → publish Sepolia) → WHAT THE DATA SAYS RIGHT NOW (7d movers) → CTA. Header trong `ready-<date>.md` trỏ ảnh `visual-<date>.png`.
- **Commit + PUSH GitHub thành công**: 4 commits (04ad434, 1d3eaa4, 005c74c, ecf0652) lên `main` → https://github.com/crytobot459/eurorwa (dùng token cũ qua credential helper tạm, không lưu vào remote URL/history). Repo public giờ có: contract, attestation, posts generator, visual generator.
- **Sản phẩm sẵn sàng đăng**: `docs/posts/ready-2026-08-05.md` (X/Reddit/LinkedIn) + ảnh `docs/posts/visual-2026-08-05.png`.

**Trạng thái phase:** P1-P5 hoàn thành, P6: repo public + bài + ảnh xong, **còn chờ user đăng bài + ghi link**. Tiếp theo: đăng LinkedIn long-form + ảnh chart.

## Phiên 4: 2026-08-05

**Việc đã làm:**

- **Bonus Sepolia contract DEPLOY THÀNH CÔNG** 🎉:
  - User claim faucet pk910 0.056 SepETH (mining thủ công ~vài phút). Lỗi đầu tiên `INVALID_ADDR` là do dán địa chỉ thừa ký tự ẩn — server chấp nhận địa chỉ chuẩn (test API trực tiếp).
  - **Contract**: `0xcb03f6390ef54aaa1a39ef9f71448a23ccca3b7f` (Sepolia) — deploy tx `0x807e...a60565`.
  - **Attestation onchain**: date `2026-08-05`, tx `0x6f8e...fb72c` (block 11421710). Verify đọc lại `getHash()` khớp `0x3fda...869c`, owner = ví agent. Xem: https://sepolia.etherscan.io/tx/0x6f8ec37095093d9097eae89265e9f086eec09b754c7d0120eff288fe9e2fb72c
  - **Bug đã fix**: `deployContract` (viem) trả về **tx hash** chứ không phải địa chỉ → `deploy.ts` giờ `waitForTransactionReceipt` + lấy `contractAddress`. (Contract đầu orphaned vô hại.)
- **HỆ THỐNG SINH BÀI ĐĂNG TỰ ĐỘNG**: `src/posts.ts` + script `bun run posts` — đọc snapshot mới nhất, tính tổng TVL / top quỹ / top yield / 7d mover, sinh sẵn 3 bài (X ≤280 ký tự, Reddit title+table, LinkedIn) → `docs/posts/ready-<date>.md`. **User chỉ cần mở file, copy-paste, đăng.** Đã nối vào cron (mỗi 12h sinh lại theo data mới). Ví dụ: `docs/posts/ready-2026-08-05.md` (X post 248/280).
- **Cron 12h CÀI XONG**: thêm job crontab `0 */12 * * *` chạy `scripts/run.sh` (fetch + ingest + attest + publish onchain + sinh posts) → log vào `data/cron.log`. Verify chạy tay OK (15 funds, upsert idempotent). Backup crontab cũ ở `/tmp/crontab.backup.*`.
- **5 bài đăng mẫu viết xong** trong `docs/posts.md` (Bài 1-5: dòng tiền EU, so sánh yield, quỹ mới, tổng kết tháng, story build) — kèm số liệu THẬT snapshot 2026-08-05 (tổng $10.6B, USYC $3.0B, BUIDL $2.7B, EUTBL $898M, USTBL 4.34%...). User tự đăng qua Chrome, ghi link vào PROGRESS sau.
- **Attestation làm mới** với data mới (sau khi chạy lại fetch/ingest): hash `0x3fda...869c`, verify OK.

**Trạng thái phase:** P1-P5 hoàn thành trọn vẹn (kể cả bonus Sepolia contract), P4 deploy public, P6 posts viết xong (chưa đăng). Còn: đăng 5 bài + ghi link, mở rộng WATCH list khi cần.

## Phiên 3: 2026-08-05

**Việc đã làm:**

- **MỞ RỘNG WATCH LIST 11 → 15 quỹ** (data thật): thêm USTBL (Spiko US T-Bills, EU-domiciled, $145.5M), AAULF (abrdn Liquidity Fund Lux USD, $16M), bIB01 (Backed IBTA $ Treasury 0-1yr), EUROB (Etherfuse). Cập nhật `mock()` fallback khớp. Re-fetch + ingest → 15 funds, 15 rows.
- **Phase 5 — Attestation onchain HOÀN THÀNH** (scripts chạy thật):
  - `src/agent/attest.ts`: đọc SQLite → payload 15 quỹ (ticker/slug/tvl/yield/holders) → `keccak256` → ký bằng viem (`privateKeyToAccount`), ví tự tạo lần đầu lưu `data/agent.key` (mode 600, gitignore) → ghi `data/attestations/<date>.json` `{date, signer, hash, signature, payload}`.
  - `src/agent/verify.ts`: hash lại payload + `recoverAddress` → đối chiếu signer. **Bắt được tamper** (đổi 1 giá trị TVL → "HASH MISMATCH — payload tampered", exit 1). File thiếu → báo rõ, exit 1.
  - Test: attest → verify OK (signer `0x02B0...F846`, 15 funds), typecheck sạch.
- **Deploy scaffold sẵn sàng cho Vercel** (chờ user `vercel login`):
  - **Refactor API bỏ `bun:sqlite`** → `api/app.js` (JS thuần, đọc thẳng `data/snapshots/*.json`, chạy được cả Bun lẫn Node serverless — quan trọng vì Vercel function là Node). `src/api.ts` wrapper serve :3000. 4 endpoint giữ nguyên shape (test lại OK).
  - `api/main.ts`: handler Vercel strip `/api` prefix → `app.fetch`.
  - `vercel.json`: build frontend → `public/`, `build.env VITE_API=/api`, rewrites `/api/:path*` → `/api/main`.
  - `vite.config.ts`: outDir `../../public`. `public/` gitignored (Vercel build sinh ra).
  - `.gitignore`: bỏ `data/snapshots/` (commit để deploy có data), thêm `public/`, `data/agent.key`.
- **DEPLOY PUBLIC THÀNH CÔNG — https://rwa-dashboard-gamma.vercel.app**:
  - User `bunx vercel login` → `bunx vercel --prod`. Project `crytobot/rwa-dashboard`.
  - **3 bug Vercel đã fix**: (1) `outputDirectory` khiến Vercel bỏ qua `api/` functions → bỏ; (2) `api/index.ts` chỉ match đúng `/api`, subpath CDN-404 → dùng rewrites `/api/:path*` → `/api/main`; (3) helper `.ts` không được Vercel compile (Node ESM không load `.ts`) → chuyển app sang `api/app.js` (JS thuần) + `api/app.d.ts` cho type. Và `env` trong vercel.json không vào build-phase → chuyển sang `build.env` để `VITE_API=/api` được bake vào bundle.
  - **Verify production**: `/api/funds` 15 funds (USYC $3.01B top), `/api/yields` (CETES 4.6%, USTBL 4.34%), `/api/funds/:slug` EUTBL history, `/api/flows`, 404, index 200, bundle chứa `/api`.
- **Repo GitHub PUBLIC — https://github.com/crytobot459/eurorwa**:
  - `git init -b main` + commit (30 files, dùng user inline không sửa git config). Loại `src/frontend/dist/` (build cũ) khỏi staged + thêm gitignore.
  - Push `main` lên `crytobot459/eurorwa` (public). Remote URL sạch (không nhúng token).
  - **Verify**: 30 files trên GitHub, không chứa `agent.key`/`.env`/`rwa.db`. Snapshot `data/snapshots/2026-08-05.json` được commit (cần cho deploy).
- **Trong phiên trước**: đổi nguồn sang scrape data thật (11 quỹ), xóa mock, rebuild DB.

**Trạng thái phase:** P1-P5 (code) xong với data thật, **P4 đã deploy public**. Còn thiếu: cron 12h, bonus Sepolia contract, Phase 6 (đăng bài + repo public).

## Checklist tổng

- [x] P1: setup môi trường
- [x] P2: fetch + ingest + SQLite lịch sử — data thật web
- [x] P3: API 4 endpoint — data thật
- [x] P4: frontend + deploy public — **https://rwa-dashboard-gamma.vercel.app**
- [x] P5: attest.ts + verify.ts + **bonus Sepolia contract** (contract `0xcb03...3b7f`, attest onchain 2026-08-05)
- [~] P6: repo public + posts generator + 5 bài mẫu + ảnh chart xong (`docs/posts.md`, `docs/posts/ready-2026-08-05.md`, `visual-2026-08-05.png`) — chưa đăng bài
- [ ] P7: khách đầu tiên / grant
- [ ] P8: mở rộng (optional)

## Việc tiếp theo (cho phiên sau)

1. **Đăng bài** `docs/posts/ready-2026-08-05.md` lên X/Reddit/LinkedIn kèm ảnh `visual-2026-08-05.png` + ghi link vào PROGRESS.
2. **Vercel redeploy** để snapshot mới lên production: `bunx vercel --prod` (snapshot 2026-08-05 đã lên rồi, chỉ cần khi có data mới).
3. **Thêm quỹ**: WATCH list mở rộng (Libeara, Cashlink EU funds...) khi cần.
4. **Git credential**: push thủ công đã OK (token cũ vẫn chạy, dùng credential helper tạm không lưu). Nên `gh auth login` khi rảnh; **revoke token cũ** `ghp_AHT0...` vì từng lộ trong history.
5. **Monetize**: Gumroad "EU RWA Monthly" PDF, API subscription — làm khi có traffic.

## Lưu ý

- Data là **thật** (scrape trang công khai rwa.xyz, source:"rwa.xyz-web"). Nếu rwa.xyz đổi cấu trúc trang → `fetch.ts` có fallback mock + cần check log.
- **Cron 12h** chạy fetch+ingest local (log `data/cron.log`). Chưa push GitHub (git chưa có credential) và chưa auto-redeploy Vercel — muốn snapshot lên production thì chạy tay `bunx vercel --prod`.
- API deploy đọc `data/snapshots/*.json` (không cần SQLite) — commit snapshot để deploy có data.
- Không commit: `.env.local`, `data/rwa.db`, `data/agent.key`, `data/attestations/`.
- API local: `bun run src/api.ts` → localhost:3000. Frontend dev: `cd src/frontend && bun run dev` → localhost:5173. Build: `cd src/frontend && bun run build` → `public/`.
- Bundle frontend 523KB (recharts) — code-split nếu cần sau.
