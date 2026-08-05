# PROGRESS — EuroRWA

> Cập nhật sau mỗi phiên opencode. Xem `ROADMAP.md` để biết chi tiết từng phase.

## Phiên gần nhất: 2026-08-05 (phiên 3)

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
- [x] P5: attest.ts + verify.ts xong (còn thiếu: bonus Sepolia contract)
- [~] P6: repo public xong (https://github.com/crytobot459/eurorwa) — còn: 5 bài đăng (user tự đăng qua Chrome)
- [ ] P7: khách đầu tiên / grant
- [ ] P8: mở rộng (optional)

## Việc tiếp theo (cho phiên sau)

1. **Cron 12h**: cài systemd timer/crontab chạy `scripts/run.sh` (fetch → ingest) mỗi 12h → snapshot tự động + `/flows` có data sau 2 ngày. Lưu ý: sau mỗi snapshot mới cần commit + push `data/snapshots/` (hoặc chấp nhận data tự động chỉ có ở máy local).
2. **Phase 6**: 5 bài đăng mẫu + khoe product (giờ có URL public) + repo public (git init + GitHub).
3. **Bonus P5**: deploy `RWAAttestation.sol` Sepolia (Foundry) — optional.
4. **Thêm quỹ**: WATCH list mở rộng thêm (Libeara, Cashlink EU funds...) khi cần.
5. **Vercel redeploy**: `bunx vercel --prod` mỗi lần đổi code (hoặc connect Git repo để auto-deploy).

## Lưu ý

- Data là **thật** (scrape trang công khai rwa.xyz, source:"rwa.xyz-web"). Nếu rwa.xyz đổi cấu trúc trang → `fetch.ts` có fallback mock + cần check log.
- API deploy đọc `data/snapshots/*.json` (không cần SQLite) — commit snapshot để deploy có data.
- Không commit: `.env.local`, `data/rwa.db`, `data/agent.key`, `data/attestations/`.
- API local: `bun run src/api.ts` → localhost:3000. Frontend dev: `cd src/frontend && bun run dev` → localhost:5173. Build: `cd src/frontend && bun run build` → `public/`.
- Bundle frontend 523KB (recharts) — code-split nếu cần sau.
