# PROGRESS — EuroRWA

> Cập nhật sau mỗi phiên opencode. Xem `ROADMAP.md` để biết chi tiết từng phase.

## Phiên gần nhất: 2026-08-05 (phiên 4)

**Việc đã làm:**

- **Cron 12h CÀI XONG**: thêm job crontab `0 */12 * * *` chạy `scripts/run.sh` (fetch + ingest) → log vào `data/cron.log`. Verify chạy tay OK (15 funds, upsert idempotent). Backup crontab cũ ở `/tmp/crontab.backup.*`.
- **5 bài đăng mẫu viết xong** trong `docs/posts.md` (Bài 1-5: dòng tiền EU, so sánh yield, quỹ mới, tổng kết tháng, story build) — kèm số liệu THẬT snapshot 2026-08-05 (tổng $10.6B, USYC $3.0B, BUIDL $2.7B, EUTBL $898M, USTBL 4.34%...). User tự đăng qua Chrome, ghi link vào PROGRESS sau.
- **Bonus Sepolia contract**: `contracts/RWAAttestation.sol` + `src/agent/deploy.ts` + `src/agent/publish.ts` viết xong, solc compile OK (3949 bytes), typecheck sạch. Thêm scripts `deploy` + `publish` vào package.json.
- **Attestation làm mới** với data mới (sau khi chạy lại fetch/ingest): hash `0x3fda...869c`, verify OK.
- **BỊ CHẶN deploy contract**: ví agent `0x02B0...F846` có **0 ETH trên Sepolia**. Faucet pk910 cần captcha chống bot (obfuscated JS) → không tự động được, cần user claim thủ công qua browser (difficulty 12, mining ~30s, min claim 0.05 SepETH).

**Trạng thái phase:** P1-P5 (code) xong với data thật, P4 deploy public, P6 posts viết xong (chưa đăng). Còn: faucet ETH → deploy+publish contract Sepolia, đăng 5 bài.

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
- [~] P5: attest.ts + verify.ts xong — bonus Sepolia contract code xong, **chờ faucet ETH để deploy**
- [~] P6: repo public + 5 bài đăng mẫu xong (`docs/posts.md`) — chưa đăng bài
- [ ] P7: khách đầu tiên / grant
- [ ] P8: mở rộng (optional)

## Việc tiếp theo (cho phiên sau)

1. **Faucet Sepolia cho agent wallet** `0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846` (user làm thủ công qua browser):
   - Mở https://sepolia-faucet.pk910.de/ → dán địa chỉ → giải captcha → mining ~30s → claim 0.05 SepETH.
2. **Sau khi có ETH**: `bun run deploy` → ghi `data/contract.json` → `bun run publish` → check Etherscan. (Contract `attest(date, hash, signature)` — publish check trùng date.)
3. **Đăng 5 bài** trong `docs/posts.md` (X/Reddit/LinkedIn) + ghi link vào PROGRESS.
4. **Vercel redeploy** để snapshot mới lên production: `bunx vercel --prod`.
5. **Thêm quỹ**: WATCH list mở rộng (Libeara, Cashlink EU funds...) khi cần.

## Lưu ý

- Data là **thật** (scrape trang công khai rwa.xyz, source:"rwa.xyz-web"). Nếu rwa.xyz đổi cấu trúc trang → `fetch.ts` có fallback mock + cần check log.
- **Cron 12h** chạy fetch+ingest local (log `data/cron.log`). Chưa push GitHub (git chưa có credential) và chưa auto-redeploy Vercel — muốn snapshot lên production thì chạy tay `bunx vercel --prod`.
- API deploy đọc `data/snapshots/*.json` (không cần SQLite) — commit snapshot để deploy có data.
- Không commit: `.env.local`, `data/rwa.db`, `data/agent.key`, `data/attestations/`.
- API local: `bun run src/api.ts` → localhost:3000. Frontend dev: `cd src/frontend && bun run dev` → localhost:5173. Build: `cd src/frontend && bun run build` → `public/`.
- Bundle frontend 523KB (recharts) — code-split nếu cần sau.
