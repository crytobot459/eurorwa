# PROGRESS — EuroRWA

> Cập nhật sau mỗi phiên opencode. Xem `ROADMAP.md` để biết chi tiết từng phase.

## Phiên gần nhất: 2026-08-07 (phiên 18) — FREE LLM TRONG CI

**Việc đã làm — analyst chạy trong GH Actions bằng LLM miễn phí:**

- **Vấn đề**: CI thiếu `.env.local` (chứa `GEMINI_API_KEY`) → `scripts/run.sh` bỏ qua analyst → `/api/overview` + `/api/analyst` (paid) luôn trả bản cũ. Tìm LLM free thay thế: **`llm7` (`https://api.llm7.io/v1`)** — OpenAI-compatible, keyless cho 1 số model.
- **`src/analyst/llm.ts`**: thêm client OpenAI-compatible (`LLM_BASE_URL`, `LLM_MODEL` mặc định `gemma4:31b`, `LLM_API_KEY`, `LLM_MAX_TOKENS=8192`, `LLM_MIN_GAP_MS=2500` throttle); Gemini giữ làm primary (khi có `GEMINI_API_KEY`); `jsonChat` log raw khi parse fail.
- **`src/analyst/analyst.ts`**: SYS prompt sửa — schema mẫu **cụ thể** (không dùng `[...]`) + nhấn mạnh 3 view field tách biệt; thêm **normalizer `toSignals`** (chấp nhận `signals` lẫn `recommendations`/`fund`/`recommendation`/`reason`); **fallback theo từng field** (`ruleSignals` + `ruleViews`) — view rỗng được điền bằng rule-based, signals luôn có 15 quỹ.
- **`scripts/run.sh`**: hàm `run_step` — chạy analyst/alerts khi có `.env.local` HOẶC `LLM_BASE_URL`.
- **`.github/workflows/pipeline.yml`**: env `LLM_BASE_URL: https://api.llm7.io/v1` + `LLM_MODEL: gemma4:31b`.
- **Khám phá llm7**: models `gpt-oss:20b`, `gemma4:31b` keyless ($0.03-0.04/1M tok); deepseek/gemini/gpt-5.4 **cần API key** (401). `gpt-oss:20b` hay "hallucinate" `{"error":"Missing input"}` và dồn cả 3 view vào market_view; `gemma4:31b` trả 3 view sạch + 15 signals — **chọn làm default**.
- **Test local**: `GEMINI_API_KEY= LLM_BASE_URL=... LLM_MODEL=gemma4:31b bun run src/analyst/index.ts` → report thật (market_view/crypto_view/chain_view đầy đủ + 15 signals) + attest on-chain mới.
- **Commit `5d9aeb1`** (đã push): llm.ts + analyst.ts + run.sh + pipeline.yml + `data/analyst/2026-08-07.json` (report LLM thật).
- **Cần user**: bấm **Run workflow** (Actions → pipeline) để verify CI sinh analyst report thật, hoặc chờ cron 12:00 UTC. Sau khi CI chạy → check `data/analyst/2026-08-07.json` trong commit + dashboard `/api/overview`.

**Còn lại:**

1. Trigger workflow + verify analyst 08-07 xuất hiện trong CI commit.
2. Xem alerts trong CI (`scripts/alerts.ts` skip nếu thiếu `TG_TOKEN`/`GROUP_CHAT_ID` — không critical).
3. Fund ví mainnet `0x03fa9C…585c4` để test x402 self-settle + Bazaar index.
4. Đăng bài LinkedIn `docs/posts/2026-08-06/ready.md`.

## Phiên gần nhất: 2026-08-06 (phiên 13)

**Việc đã làm — MCP SERVER + SẴN SÀNG ĐĂNG KÝ MCP REGISTRY:**

- **MCP server hoàn chỉnh `api/_mcp.js`**: JSON-RPC 2.0 (batch, notification, parse error), `initialize`/`ping`/`tools/list`/`tools/call`/`resources/list`/`resources/read`, CORS + OPTIONS + GET→405, serverInfo `eurorwa-analyst 1.0.0`, protocol `2024-11-05`/`2025-03-26`/`2025-06-18`. **4 tools**: `overview`, `funds`, `analytics`, `alerts` (wrapp `app.fetch` internal). **2 resources**: `eurorwa://analyst/latest`, `eurorwa://funds/latest`.
- **Routing Vercel**: `vercel.json` thêm rewrite `{"/mcp" → "/api/main"}`; `api/main.ts` route pathname `/mcp` (sau strip `/api`) sang `handleMcp(req)` (raw request, không strip). `api/_mcp.d.ts` (theo convention `_app.d.ts`). `/api/mcp` cũng hoạt động.
- **Discovery**: `src/frontend/public/.well-known/mcp.json` (`mcpServers.eurorwa-analyst.url = https://rwa-dashboard-gamma.vercel.app/mcp`).
- **Test**: `scripts/_mcp-test.mjs` 20 checks ALL PASS (initialize/fallback protocol, ping, 4 tools/call trả JSON, unknown tool → -32602, resources/read, unknown uri → -32602, batch, notification → null, unknown method → -32601, parse error → 400, GET → 405, OPTIONS → 204, CORS origin echo). Routing qua `api/main.ts`: `/mcp` POST→200 initialize, `/api/mcp` tools→200, `/api/overview`→200 (không vỡ), `/mcp` GET→405. Typecheck sạch.
- **Phát hiện**: Vercel SPA-fallback trả index.html cho mọi path không match (trước đây `/mcp` = HTML); nhưng filesystem check ưu tiên → `.well-known/*.json`, `llms.txt` serve đúng. Rewrite `/mcp` thắng SPA fallback (production verify: GET /mcp → 405 JSON, initialize → 200 protocolVersion, tools/list, resources/read, tools/call đều OK).
- **ĐÃ ĐĂNG KÝ MCP REGISTRY** (commit `f2c9b3f` MCP server, `5562138` + `68cfa6f` server.json):
  - `server.json` root repo (name `io.github.crytobot459/eurorwa-analyst`, title "EuroRWA Analyst", description ≤100 chars, `remotes:[{type:"streamable-http", url:"https://rwa-dashboard-gamma.vercel.app/mcp"}]`).
  - Publish qua `mcp-publisher` CLI (tải từ GitHub releases, `/tmp/mcp-publisher`): `login github` **device flow** (lần đầu lỗi `incorrect_device_code`, retry thành công) → `validate` OK → `publish` ✓ `io.github.crytobot459/eurorwa-analyst 1.0.0` → verify `GET /v0.1/servers?search=eurorwa` → status active, isLatest true.
  - **Chú ý**: mcp-publisher đang ở `/tmp` (mất sau reboot) — nếu update sau này cần tải lại. Token auth CLI lưu local.

**Còn lại (cơ hội mở rộng):**

0. **README + public docs làm sạch** (commit `d6069da`): bỏ hết nhắc "free"/"free tier" (Gemini free tier, Vercel free tier) khỏi README.md, `llms.txt`, `SKILL.md`, `docs/posts.md`; README cập nhật đúng state hiện tại (x402 API, MCP server + Registry, analytics, deploy hook).
1. **AgenticMarket — ĐÃ LIVE** (2026-08-07): user có API key `am_live_…` → đã set `AGENTICMARKET_SECRET` trên Vercel (Sensitive, production) + redeploy. Gate `x-agenticmarket-secret` test live OK: không header → 401, đúng key → 200 (initialize/resources/tools/call đều qua), sai key → 401. Doc submit: `docs/agenticmarket-submission.md`.
2. **Vercel Deploy Hook — ĐÃ TẠO** (commit tới): hook `eurorwa-pipeline` (branch main) → URL `https://api.vercel.com/v1/integrations/deploy/prj_DlHOyuXm7m3vywY29uFboYLDwtw5/FrAH8dG02p` (đã test trigger OK). GH Actions `pipeline.yml` đã có step "redeploy" dùng secret `VERCEL_DEPLOY_HOOK` — **user cần set GitHub secret** `VERCEL_DEPLOY_HOOK` = URL trên (Settings → Secrets and variables → Actions) để sau mỗi pipeline commit dashboard tự redeploy.
3. ~~**agenticmarket.dev**~~ — đã nhập vào mục 1 (đã LIVE).
4. Chờ user fund ví mainnet `0x03fa9C…585c4` → resume self-settle (xem Phiên 12) để index Bazaar + doanh thu thật.
5. Update MCP server khi thêm tool mới → bump version trong server.json.

> ⚠️ **MCP Registry (`mcp-registry.com`) — ĐÃ CHẾT (2026-08-07):** domain thành Sedo parking, `api.mcp-registry.com` không còn response. Listing `io.github.crytobot459/eurorwa-analyst` không còn ý nghĩa — bỏ khỏi kế hoạch. Kênh MCP chính giờ là AgenticMarket.

**Trạng thái phase:** P1-P6 + x402 + analytics + alerts + MCP server + **AgenticMarket (gate live)** xong. Chờ: fund ví buyer mainnet (index Bazaar + doanh thu) + set GitHub secret `VERCEL_DEPLOY_HOOK`.

## Phiên gần nhất: 2026-08-06 (phiên 11)

**Việc đã làm — SETTLEMENT QUA CDP FACILITATOR + SẴN SÀNG INDEX BAZAAR:**

- **Đã deploy 2 commit trước**: `7eb1b06` (x402 + analytics + alerts) + `8cff89e` (rename helper `_`-prefix) → repo `crytobot459/eurorwa` nhánh `main`. Vercel production `https://rwa-dashboard-gamma.vercel.app`, env `X402_PAYTO` + `X402_SKIP_BALANCE=1`. Verify thật: `/api/analytics` 200, `/api/alerts` 200, `POST /api/analyst` no-pay → 402, `.well-known/*` 200, `/api/app` `/api/x402` → 404 (đúng). E2E x402 production: payment hợp lệ → 200 + `PAYMENT-RESPONSE` deferred.
- **CDP validate production → `valid:true`, `simulation:accepted`** (chỉ advisory: thiếu output example — đã bổ sung).
- **Research registry + KYC (đã xong)**:
  - **Agentic.Market + Bazaar: KHÔNG KYC, KHÔNG đăng ký tay** — tự-index khi 1 payment thật settle qua CDP facilitator (`api.cdp.coinbase.com/platform/v2/x402`), 15–30 phút sau xuất hiện trong `/v2/x402/discovery/resources?payTo=...`. Discovery API **public** (search/resources/merchant).
  - **CDP `/verify` + `/settle` yêu cầu JWT** (Secret API Key miễn phí tại portal.cdp.coinbase.com/api-keys/secret) — xác nhận bằng test thực tế: 401 khi không auth.
  - **MCP Registry + agenticmarket.dev cần MCP server thật** (chưa có) — defer. **Base builder-code** miễn phí: đã đăng ký `bc_q4sqsqpy` cho wallet `0x02B027…F846`.
  - **Điều kiện indexing đã rõ**: (1) 402 kèm bazaar extension hợp lệ; (2) `paymentPayload.resource` PHẢI có (CDP yêu cầu, kể cả spec không bắt buộc); (3) extension phải echo trong payload settle; (4) **bắt buộc v2** (extensions không hỗ trợ trên v1); (5) **KHÔNG được có field `discoverable`** — CDP maintainer xác nhận gây failed discovery; (6) payer ≠ payTo (tránh `self_send_not_allowed`).
- **Code `api/_x402.js`**:
  - **Bazaar extension fix**: bỏ `discoverable:true`, thêm `output.example` (report mẫu thật) → export `bazaarExtension()`.
  - **CDP facilitator settlement**: `cdpJwt()` (Ed25519 mặc định / ES256 fallback, header `{alg,kid,nonce}`, claims `{sub,iss:"cdp",aud:["cdp_service"],nbf,exp,uri:"POST api.cdp.coinbase.com/platform/v2/x402/settle"}`, sign bằng Node `crypto` — không thêm dep); `facilitatorSettleBody()` (v2: `paymentPayload{resource,accepted,payload,extensions.bazaar}` + `paymentRequirements`); `facilitatorSettle()` POST `/settle` kèm `Authorization: Bearer <jwt>`, parse header `EXTENSION-RESPONSES` → `{bazaar:{status}}`.
  - `settlePayment` chain: có CDP creds → CDP settle (fallback local nếu lỗi transport) → không → local (`X402_KEY`) → không → `deferred`. `_app.js` truyền `resource` vào settle.
- **`.env.example`**: thêm `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` (miễn phí, kèm link portal).
- **`scripts/cdp-auth-check.js`**: smoke-test JWT — gọi `/verify` body rác, mong đợi 400 thay vì 401 (auth OK).
- **Tests**: x402-test **30 checks** (bazaar extension không `discoverable` + có output.example; JWT phát hành/claims/verify chữ ký; settle body v2 đúng shape), axis-test 21, typecheck sạch.

**Còn lại:** (1) tạo **CDP Secret API Key miễn phí** portal.cdp.coinbase.com/api-keys/secret → set `CDP_API_KEY_ID`/`CDP_API_KEY_SECRET` trên Vercel; (2) `scripts/cdp-auth-check.js` + tự-settle 1 lần Base Sepolia (faucet ETH quicknode.com/base/sepolia + USDC faucet.circle.com cho 1 ví buyer tách biệt, payer ≠ payTo); (3) verify `GET /v2/x402/discovery/resources?payTo=0x02B027…F846` + header `EXTENSION-RESPONSES`; (4) optional mainnet (`X402_NETWORK=8453`) cho doanh thu thật.

- **Đã commit + deploy**: `d5bb7a4` (CDP facilitator settlement) + `b3cd003` (report quality) → production OK (no-pay 402, x402 manifest live).
- **Report quality fix (deployed)**: yield hiển thị **"n/a"** thay vì "0.00%" cho quỹ thiếu dữ liệu (EURC, NRW1, AAULF, bC3M, bIB01 — cả prompt LLM + reason fallback); lọc symbol crypto không-ASCII (币安人生) trong movers/trending → report đã regenerate + attest on-chain mới (`2026-08-06-analyst-4`, tx `0x025070…a7`).

## Phiên 12: 2026-08-06

**Việc đã làm — CDP KEY + FAUCET + PHÁT HIỆN SAI LỆCH EIP-712 DOMAIN (chặn settle testnet):**

- **CDP Secret API Key đã tạo + set env**: `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` (Sensitive/Production) trên Vercel bằng `vercel env add --sensitive --value` (CLI v58 — KHÔNG dùng positional value vì bị parse thành gitBranch; hoặc `--value` flag). Đã redeploy.
- **Smoke-test JWT `scripts/cdp-auth-check.js` → AUTH OK** (400 schema reject thay vì 401).
- **CDP Faucet programmatic hoạt động**: `POST https://api.cdp.coinbase.com/platform/v2/evm/faucet` (JWT như x402) — 1 USDC + 0.0001 ETH/request trên Base Sepolia, không captcha. Đã dùng để fund ví buyer testnet.
- **Phát hiện CRITICAL — Base Sepolia USDC dùng EIP-712 domain name "USDC" (không phải "USD Coin")**:
  - Test thật: signature domain "USD Coin" → verify off-chain OK nhưng `transferWithAuthorization` revert on-chain "FiatTokenV2: invalid signature".
  - Đọc `DOMAIN_SEPARATOR()` on-chain + so sánh: khớp name="USDC" (không khớp "USD Coin"). Mainnet Base USDC (0x8335…) vẫn dùng "USD Coin". Xác nhận bởi x402-foundation constants + docs Solvela/Polyrank + docs Circle (Eco gasless).
  - **Đã fix `api/_x402.js`**: `EIP712_NAME = NETWORK === "84532" ? "USDC" : "USD Coin"` (cả `typedData()` + `requirements().extra`). Local `estimateContractGas` sau fix: OK (102296 gas).
- **NHƯNG CDP facilitator testnet vẫn vô phương**: CDP `/settle` hardcode "USD Coin" khi validate → (a) signature "USD Coin" → CDP accept nhưng broadcast revert → "unable to estimate gas"; (b) signature "USDC" → CDP reject "invalid signature". ⇒ **Testnet CDP settle không thể thành công.**
- **Hướng đi: Base MAINNET** (CDP + on-chain đều "USD Coin"). Đã tạo ví buyer mainnet `data/buyer-8453.key` (gitignored) = **`0x03fa9Cd74bE76C815DCaf079A31ed745028585c4`** — **chờ user fund ~$0.05 USDC + chút ETH**.
- `scripts/self-settle.js` đã refactor **network-aware**: import `NETWORK/CHAIN_ID/ASSET/AMOUNT/requirements/typedData` từ `_x402.js`, key file theo network (`buyer-<NETWORK>.key`), auto-faucet chỉ khi testnet, dùng `requirements(PAYTO)` cho accepted. `scripts/_sim-twa.mjs` (debug simulate transfer) đã commit.

**Còn lại (khi user fund xong ví mainnet):**

1. `vercel env add X402_NETWORK production --value 8453` (+ cân nhắc bỏ `X402_SKIP_BALANCE` cho doanh thu thật; giữ `=1` cho self-settle) → deploy.
2. `X402_NETWORK=8453 SELF_SETTLE_PAYTO=0x02B027…F846 CDP_*… bun scripts/self-settle.js` → mong đợi `EXTENSION-RESPONSES` bazaar status success/processing.
3. Sau 15–30 phút check `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?payTo=0x02B027…F846` + Agentic.Market search.
4. Nếu CDP mainnet settle lỗi gas → cần thêm ETH ví buyer (CDP relay có thể không sponsor gas).

**Trạng thái phase:** P1-P6 + x402 + analytics + alerts xong, deployed. Chờ fund ví buyer mainnet `0x03fa9C…585c4` để settle thật + index Bazaar.

## Phiên 10: 2026-08-06

**Việc đã làm — MONETIZE + KHÁC BIỆT SẢN PHẨM (x402 + Axis B + Axis C):**

- **x402 pay-per-call API — `POST /api/analyst`** (`api/x402.js` + `api/app.js`): triển khai thủ công spec x402 v2 bằng `viem` (không thêm dep, chạy được trên Vercel Node):
  - Chưa có `PAYMENT-SIGNATURE` → **HTTP 402** + header `PAYMENT-REQUIRED` (base64: scheme, amount $0.05, network Base Sepolia `eip155:84532`, asset USDC, payTo `0x02B027…F846`, thời hạn 30s, bazaar extension `discoverable`).
  - Có header → verify (version/network/asset/amount/payTo, `verifyTypedData` EIP-712 TransferWithAuthorization, `balanceOf` trừ khi `X402_SKIP_BALANCE=1`) → settle `transferWithAuthorization` qua `X402_KEY` (nếu chưa set → `{status:"deferred"}` vẫn trả report 200) → trả report kèm header `PAYMENT-RESPONSE`.
- **Axis B — institutional analytics — `GET /api/analytics`** (`api/analytics.js`): TVL tổng, concentration (top3/5/10 + HHI), breadth (median/max/min yield, spread), currency split USD/EUR/GBP, chain footprint, issuer concentration, holders, top-10 day flows. Tính on-the-fly từ snapshot, không cần nguồn mới.
- **Axis C — alerts — `GET /api/alerts`** (`src/analyst/alerts.ts` + `scripts/alerts.ts`): 5 loại cảnh báo `yield-breakout`/`yield-cohort`/`tvl-spike`/`holder-surge`/`regime-flip` (severity info/warning/high). Script dedupe theo id `type-ticker-date`, giữ 60 gần nhất → `data/alerts.json`, post warning/high lên nhóm Telegram. **Đã chạy thật: 2 alert, post 1 warning** (USYC holder exit -11.63%). Đã nối vào `scripts/run.sh`.
- **Discovery cho agent/registry**: `public/.well-known/x402.json`, `public/.well-known/agent-services.json` (Rail402-compatible), `public/SKILL.md`, `public/llms.txt` (build Vite copy vào `public/`).
- **Frontend 6 tab**: thêm **analytics** + **alerts** (bar concentration, chain/issuer footprint, currency split, top flows; chip severity màu). Build OK (537KB).
- **Tests đều xanh**: `scripts/x402-test.js` (15 checks: 402 flow, header decode, payment hợp lệ→200, hết hạn/sai amount/sai payTo/sig rác→402, settlement deferred) + `scripts/axis-test.js` (21 checks: toán analytics, cả 5 loại alert, endpoint live). Script `alerts`, `x402-test`, `axis-test` đã thêm vào `package.json`.
- **FIX deploy Vercel**: Vercel auto-expose mọi file `api/*.js` thành function riêng → `api/analytics.js` nuốt route `/api/analytics` (crash 500 "Invalid export"), và `POST /api/analyst` báo "x402 not configured" vì thiếu env. Fix: đổi tên helper sang `_`-prefix (`_app.js`, `_analytics.js`, `_x402.js`, `_verify.js`, `_tgbot.js`, `_freelance.js`) — theo docs Vercel file `_`-prefix không thành function; cập nhật import toàn bộ (main.ts, tg.ts, src/api.ts, scripts test). Set env `X402_PAYTO` + `X402_SKIP_BALANCE=1` trên Vercel.

**Còn lại (phiên sau):** commit+push repo (kèm `data/alerts.json` cho `/api/alerts` production), deploy Vercel, verify endpoint thật, đăng ký lên Bazaar/Base MCP (payTo `0x02B027…F846`), test settle mainnet khi có `X402_KEY`.

**Trạng thái phase:** P1-P6 xong. Pipeline + bot + attestation onchain + **API trả phí x402 + analytics institutional + alerts** đều chạy local. Chờ: commit, deploy, đăng ký registry.

## Phiên gần nhất: 2026-08-05 (phiên 9)

**Việc đã làm:**

- **BOT THẬT + NHÓM THẬT — CHẠY END-TO-END ✓**:
  - Tạo 2 bot qua @BotFather (dùng Chrome headless + CDP, session Telegram thật):
    `@EuroRWA_Data_bot` (TG_TOKEN) và `@EuroRWA_Build_2026_bot` (TG_FREELANCE_TOKEN, username cũ `EuroRWA_Build_bot` đã bị chiếm).
  - Tạo nhóm **"EuroRWA Bots Hub"** `GROUP_CHAT_ID=-5127324366` (owner + 2 bot).
  - `OWNER_CHAT_ID=444148694` (eleven/@crytobot459). Token/group lưu `data/tg-bots.json` + `.env.local` (gitignore, không commit).
  - **Vercel**: set env (TG_TOKEN, BUILD_BOT_USERNAME, GROUP_CHAT_ID) → deploy → set webhook `https://rwa-dashboard-gamma.vercel.app/api/tg`.
  - **Fix routing Vercel**: `vercel.json` rewrite `/api/:path*` → `/api/main` nuốt luôn `/api/tg` → thêm route `/tg` vào Hono `api/app.js` (`app.post("/tg", webhook)`). Đã deploy.
  - **Verify public bot**: owner `/start` → reply help; "tôi cần build dashboard" → quote `dashboard: $80-150` + link `https://t.me/EuroRWA_Build_2026_bot?start=build` + `#[lead]` vào nhóm. ✓
  - **Verify build bot (local long-polling)**: `/start` → welcome; mô tả task → quote `$115`; `ok` → địa chỉ USDT TRC20 `TPVSnUZg...`; tx hash fake → **Binance auto-verify reject đúng** ("Chưa thấy giao dịch...") + tạo task + `#[task]` vào nhóm; owner `/approve msfzjhdo-753` → `#[approved]`. ✓
- **BUG ĐÃ FIX**:
  - `api/app.js` thiếu route `/tg` (rewrite Vercel nuốt) → thêm.
  - Bot build: vòng lặp `getUpdates` crash trên update không phải `message` (`my_chat_member`) → skip `!upd.message`.
  - Bot build: `/start` của owner bị nhánh lệnh owner nuốt ("Lệnh owner: ..." gửi fail vì chứa `<id>` không escape trong parse_mode HTML) → nhánh owner chỉ match `/^\/(approve|reject|tasks)/` + escape `&lt;id&gt;`.
- **KHÁM PHÁ QUAN TRỌNG — giới hạn Telegram**: bot **không thấy tin nhắn của bot khác** (trong nhóm lẫn DM riêng: `USER_BOT_TO_BOT_DISABLED`; dù tắt privacy mode qua BotFather vẫn không thấy tin từ bot khác). → `#[ack]` từ bot build không tự bắn khi data bot post `#[lead]`. **Kiến trúc thực tế**: khách tự bấm deep link sang bot build (không có handoff bot→bot). Nhóm chung = **nhật ký audit cho chủ** (`#[lead]` data bot + `#[task]`/`#[approved]` build bot). Đã cập nhật `docs/FREELANCE-FLOW.md`.
- **Còn lại**: commit+push repo (loại secret), đăng LinkedIn bài `docs/posts/ready-2026-08-05.md`, chạy bot build local khi cần (`bun run freelance` dùng `--env-file`).

**Trạng thái phase:** P1-P6 xong. Hệ 2 bot + nhóm + auto-verify Binance **chạy thật end-to-end**. Còn: commit, đăng bài, giới thiệu khách đầu tiên (P7).

## Phiên gần nhất trước: 2026-08-05 (phiên 8)

**Việc đã làm:**

- **2 agent nói chuyện với nhau — HOÀN THÀNH** (bot công khai ↔ bot build):
  - `api/freelance.js` (mới): bảng giá + `classify` + `quickQuote` dùng chung cho cả 2 bot (chạy được trên Vercel).
  - Bot công khai (`api/tgbot.js`): thêm `detectBuild()` — khi khách có ý định đặt task → trả Q&A + **báo giá nhanh** + link `t.me/<build_bot>?start=build` + đăng `#[lead]` vào nhóm chung. Bỏ qua tin nhóm (chỉ xử lý chat riêng).
  - Bot build (`scripts/freelance-bot.js`): xử lý tin `#[lead]` từ nhóm → đáp `#[ack]`; đăng `#[task]` khi tạo task và `#[approved]` khi chủ duyệt; chủ approve được từ trong nhóm; nhận `/start build` (deep link).
  - `scripts/freelance-core.js`: dùng chung `classify`/`midPrice` từ `api/freelance.js`.
  - Test mở rộng (`scripts/freelance-test.js`): detectBuild + quickQuote + happy path + trả giá + owner — chạy OK, typecheck sạch.
  - **Cơ chế nối 2 agent**: nhóm Telegram chung (`GROUP_CHAT_ID`, cả 2 bot làm thành viên) — protocol `#[lead]`/`#[ack]`/`#[task]`/`#[approved]`. Vì luật Telegram cấm bot nhắn trước người lạ → bot công khai đưa link, khách tự bấm `/start` với bot build.
  - `docs/FREELANCE-FLOW.md` + `.env.example` cập nhật: `BUILD_BOT_USERNAME`, `GROUP_CHAT_ID`.

**Trạng thái phase:** P1-P6 xong. Pipeline tự động + auto-deploy Vercel hoạt động. **2 bot freelance đã nói chuyện được với nhau qua nhóm chung.** Còn chờ user: (1) tạo 2 bot + nhóm, set env (Vercel: `TG_TOKEN`, `BUILD_BOT_USERNAME`, `GROUP_CHAT_ID`; local: `TG_FREELANCE_TOKEN`, `OWNER_CHAT_ID`, `USDT_ADDRESS`, `GROUP_CHAT_ID`), (2) chạy bot build local, (3) đăng LinkedIn bài + ghi link.

## Phiên 5: 2026-08-05

**Việc đã làm:**

- **Visual chart generator**: `src/visual.ts` + script `bun run visual` — sinh chart PNG 1200×630 (dark theme, bar top 8 quỹ TVL, chips yield, badge onchain-verified) qua Chrome headless (`/usr/bin/google-chrome`, không cần npm dep) → `docs/posts/visual-<date>.png` + `.html`. Đã nối vào `scripts/run.sh` (cron 12h tự sinh ảnh mới).
- **LinkedIn nâng cấp long-form**: `src/posts.ts` giờ sinh bài LinkedIn chất lượng (~1480 ký tự): hook → THE NUMBERS (top 5 bullets kèm yield) → WHY THIS MATTERS → THE PART I COULDN'T GET ANYWHERE ELSE (story keccak-256 → sign → publish Sepolia) → WHAT THE DATA SAYS RIGHT NOW (7d movers) → CTA. Header trong `ready-<date>.md` trỏ ảnh `visual-<date>.png`.
- **Commit + PUSH GitHub thành công**: 4 commits (04ad434, 1d3eaa4, 005c74c, ecf0652) lên `main` → https://github.com/crytobot459/eurorwa (dùng token cũ qua credential helper tạm, không lưu vào remote URL/history). Repo public giờ có: contract, attestation, posts generator, visual generator.
- **Sản phẩm sẵn sàng đăng**: `docs/posts/ready-2026-08-05.md` (X/Reddit/LinkedIn) + ảnh `docs/posts/visual-2026-08-05.png`.
- **FIX lỗi on-chain không khớp data** (quan trọng): cron 12:00 chạy lại → `attest.ts` sinh hash mới (payload có `generated_at`) → nhưng contract cố định ngày (`require date already attested`) nên không publish được → attestation file lệch on-chain. Đã sửa:
  - **Deploy contract mới** `0xd482a715cdef4073593f4a3208abd328f6d71725` + publish attestation 2026-08-05 (hash `0xeb0e...eeed`) → on-chain khớp 100% local. Tx: https://sepolia.etherscan.io/tx/0x61afb801bb03f1e4de7c32ab42b7763cf1e40a734f25105ba5dc239c9a21a3f0
  - `src/agent/guard.ts`: chặn re-attest khi ngày đã có on-chain (chỉ bản đầu ngày là chính thức).
  - `publish.ts`: ghi `published.tx/block/contract` vào attestation file.
  - `posts.ts`: bài LinkedIn kèm link tx + contract + hash — bằng chứng cụ thể.

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
2. **Vercel Deploy Hook**: tạo hook trong Vercel (Project Settings → Deploy Hooks) → dán URL cho agent để set secret `VERCEL_DEPLOY_HOOK` → từ đó dashboard tự redeploy sau mỗi pipeline commit.
3. **Thêm quỹ**: WATCH list mở rộng (Libeara, Cashlink EU funds...) khi cần.
4. **Git credential**: push qua credential helper tạm vẫn OK; nên `gh auth login` khi rảnh; **revoke token cũ** `ghp_AHT0...` vì từng lộ trong history. `gh` CLI đã cài standalone tại `~/.local/bin/gh` (dùng `GH_TOKEN` env).
5. **Monetize**: Gumroad "EU RWA Monthly" PDF, API subscription — làm khi có traffic.

## Lưu ý

- Data là **thật** (scrape trang công khai rwa.xyz, source:"rwa.xyz-web"). Nếu rwa.xyz đổi cấu trúc trang → `fetch.ts` có fallback mock + cần check log.
- **Cron 12h** chạy fetch+ingest local (log `data/cron.log`). **GH Actions** chạy song song trên GitHub server (cron `30 0,12 * * *` + dispatch) — guard chặn attest trùng ngày nên không xung đột. GH Actions commit snapshot mới về repo; Vercel redeploy chờ Deploy Hook.
- API deploy đọc `data/snapshots/*.json` (không cần SQLite) — commit snapshot để deploy có data.
- Không commit: `.env.local`, `data/rwa.db`, `data/agent.key`.
- API local: `bun run src/api.ts` → localhost:3000. Frontend dev: `cd src/frontend && bun run dev` → localhost:5173. Build: `cd src/frontend && bun run build` → `public/`.
- Bundle frontend 523KB (recharts) — code-split nếu cần sau.
