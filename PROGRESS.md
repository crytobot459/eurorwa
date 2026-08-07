# PROGRESS — EuroRWA

> Updated after each opencode session. See `ROADMAP.md` for phase details.

## Most recent session: 2026-08-07 (session 19) — WEB ANALYTICS + DIRECTORY REGISTRATION

**What was done — Vercel Web Analytics live + API registered on directories:**

- **Vercel Web Analytics ENABLED** (via `POST /web/insights/toggle`, `{"value":true}`) + deployed frontend containing `@vercel/analytics` `inject()`. Production `/_vercel/insights/script.js` now serves real JS (`application/javascript`). Query API `GET /v1/query/web-analytics/visits/count` works (baseline 0 visitors — counting starts now).
- **Market/news scan (2026-08-07)**: Fed hold 3.50–3.75% (3 hawks dissent), yields fell early week (10Y ~4.63%) on Hormuz de-escalation hopes, Brent back >$83 after Houthi strike on Saudi → inflation worry returns; jobs + CPI next week. BTC ~$64-65k sideway, 4-day spot ETF inflow (~$626-754M, IBIT 76%) but Fear & Greed 25-29 (extreme fear), CLARITY Act slipped to September. **RWA deposits tripled to $7.4B Q2/26** (CoinShares/Token Terminal) while DeFi deposits fell 15%; DTCC Tokenization Service launches Oct 2026. Project analyst 08-07: BUY eurSAFO/USTBL/SAFO, SELL USYC/UKTBL/EUROB.
- **Directory registration**:
  - **402 Index REGISTERED** (`POST 402index.io/api/v1/register`) — probe validated 402 challenge (`httpStatus:402`, assetKnown, v2), `health:healthy`, **status pending review** (id `cd0f890e-f785-4b14-bca2-de483b99fa6a`). For instant approval: domain verification via `POST /api/v1/claim` + `/api/v1/claim/verify`.
  - **x402scan DISCOVERY FIXED** (was `No discovery document found`): added `x-payment-info` (protocols x402 + price fixed $0.05) + `x-discovery.ownershipProofs` to `openapi.json`, created `/.well-known/x402` (v1 compat: `resources` + `ownershipProofs`), added `vercel.json` rewrite `/openapi.json → /.well-known/openapi.json`. `checkDiscovery` now `found:true, source:openapi, 8 resources, /api/analyst authMode:paid`.
  - **x402scan REGISTRATION BLOCKED — network**: paid endpoint advertises `eip155:84532` (base_sepolia), x402scan only supports `base`/`solana`. **User chose to keep testnet** → x402scan registration deferred until `X402_NETWORK=8453` (Base mainnet) is set.
  - **agentic.market**: `GET api.agentic.market/v1/services?q=eurorwa` returns 0 — earlier gate test was live; listing search needs follow-up.
  - **CDP Bazaar**: discovery API returned 504 on query; indexing requires real settlement anyway (mainnet pending).
- **402 Index DOMAIN VERIFIED ✅** — created `src/frontend/public/.well-known/402index-verify.txt` (hash `ab79a0d3…5681abe`), deployed, `POST /api/v1/claim/verify` → `{"status":"verified","services_count":1,"retroactively_approved":1}`. Listing `cd0f890e-…` page (`/service/cd0f890e-f785-4b14-bca2-de483b99fa6a`) now shows **verified** — pending review resolved, no manual wait.
- **Deployed** thrice (analytics + discovery fixes + verify file). Typecheck/build clean.

**Still open (unchanged from session 18 unless noted):**

1. Trigger workflow + verify analyst 08-07 appears in the CI commit.
2. Check alerts in CI (`scripts/alerts.ts` skips if `TG_TOKEN`/`GROUP_CHAT_ID` missing — not critical).
3. Fund mainnet wallets → set `X402_NETWORK=8453` → self-settle → **then register x402scan** + CDP Bazaar indexes.
4. Post LinkedIn `docs/posts/2026-08-06/ready.md`.

## Most recent session: 2026-08-07 (session 18) — FREE LLM IN CI

**What was done — analyst now runs in GH Actions using a free LLM:**

- **Problem**: CI lacked `.env.local` (holds `GEMINI_API_KEY`) → `scripts/run.sh` skipped the analyst → `/api/overview` + `/api/analyst` (paid) always returned stale data. Found a free LLM replacement: **`llm7` (`https://api.llm7.io/v1`)** — OpenAI-compatible, keyless for some models.
- **`src/analyst/llm.ts`**: added OpenAI-compatible client (`LLM_BASE_URL`, `LLM_MODEL` default `gemma4:31b`, `LLM_API_KEY`, `LLM_MAX_TOKENS=8192`, `LLM_MIN_GAP_MS=2500` throttle); Gemini stays as primary (when `GEMINI_API_KEY` present); `jsonChat` logs raw when parse fails.
- **`src/analyst/analyst.ts`**: SYS prompt fixed — **explicit** schema example (no `[...]`) + emphasis that the 3 view fields are separate; added **`toSignals` normalizer** (accepts `signals` and `recommendations`/`fund`/`recommendation`/`reason`); **per-field fallback** (`ruleSignals` + `ruleViews`) — empty views filled rule-based, signals always has all 15 funds.
- **`scripts/run.sh`**: `run_step` function — runs analyst/alerts when `.env.local` OR `LLM_BASE_URL` is set.
- **`.github/workflows/pipeline.yml`**: env `LLM_BASE_URL: https://api.llm7.io/v1` + `LLM_MODEL: gemma4:31b`.
- **llm7 exploration**: models `gpt-oss:20b`, `gemma4:31b` keyless ($0.03-0.04/1M tok); deepseek/gemini/gpt-5.4 **require API key** (401). `gpt-oss:20b` tends to "hallucinate" `{"error":"Missing input"}` and dump all 3 views into market_view; `gemma4:31b` returns clean 3 views + 15 signals — **chosen as default**.
- **Local test**: `GEMINI_API_KEY= LLM_BASE_URL=... LLM_MODEL=gemma4:31b bun run src/analyst/index.ts` → real report (full market_view/crypto_view/chain_view + 15 signals) + fresh on-chain attestation.
- **Commit `5d9aeb1`** (pushed): llm.ts + analyst.ts + run.sh + pipeline.yml + `data/analyst/2026-08-07.json` (real LLM report).
- **Needs user**: click **Run workflow** (Actions → pipeline) to verify CI produces a real analyst report, or wait for the 12:00 UTC cron. After CI runs → check `data/analyst/2026-08-07.json` in the commit + dashboard `/api/overview`.

**Still open:**

1. Trigger workflow + verify analyst 08-07 appears in the CI commit.
2. Check alerts in CI (`scripts/alerts.ts` skips if `TG_TOKEN`/`GROUP_CHAT_ID` missing — not critical).
3. Fund mainnet wallet `0x03fa9C…585c4` to test x402 self-settle + Bazaar index.
4. Post LinkedIn `docs/posts/2026-08-06/ready.md`.

## Most recent session: 2026-08-06 (session 13)

**What was done — MCP SERVER + READY TO REGISTER ON MCP REGISTRY:**

- **Complete MCP server `api/_mcp.js`**: JSON-RPC 2.0 (batch, notification, parse error), `initialize`/`ping`/`tools/list`/`tools/call`/`resources/list`/`resources/read`, CORS + OPTIONS + GET→405, serverInfo `eurorwa-analyst 1.0.0`, protocol `2024-11-05`/`2025-03-26`/`2025-06-18`. **4 tools**: `overview`, `funds`, `analytics`, `alerts` (wrap `app.fetch` internally). **2 resources**: `eurorwa://analyst/latest`, `eurorwa://funds/latest`.
- **Vercel routing**: `vercel.json` added rewrite `{"/mcp" → "/api/main"}`; `api/main.ts` routes pathname `/mcp` (after strip `/api`) to `handleMcp(req)` (raw request, no strip). `api/_mcp.d.ts` (per `_app.d.ts` convention). `/api/mcp` also works.
- **Discovery**: `src/frontend/public/.well-known/mcp.json` (`mcpServers.eurorwa-analyst.url = https://rwa-dashboard-gamma.vercel.app/mcp`).
- **Test**: `scripts/_mcp-test.mjs` 20 checks ALL PASS (initialize/fallback protocol, ping, 4 tools/call returns JSON, unknown tool → -32602, resources/read, unknown uri → -32602, batch, notification → null, unknown method → -32601, parse error → 400, GET → 405, OPTIONS → 204, CORS origin echo). Routing via `api/main.ts`: `/mcp` POST→200 initialize, `/api/mcp` tools→200, `/api/overview`→200 (not broken), `/mcp` GET→405. Typecheck clean.
- **Discovery**: Vercel SPA-fallback returns index.html for any non-matching path (previously `/mcp` = HTML); but filesystem check takes priority → `.well-known/*.json`, `llms.txt` served correctly. Rewrite `/mcp` wins over SPA fallback (production verify: GET /mcp → 405 JSON, initialize → 200 protocolVersion, tools/list, resources/read, tools/call all OK).
- **REGISTERED ON MCP REGISTRY** (commit `f2c9b3f` MCP server, `5562138` + `68cfa6f` server.json):
  - `server.json` in repo root (name `io.github.crytobot459/eurorwa-analyst`, title "EuroRWA Analyst", description ≤100 chars, `remotes:[{type:"streamable-http", url:"https://rwa-dashboard-gamma.vercel.app/mcp"}]`).
  - Published via `mcp-publisher` CLI (downloaded from GitHub releases, `/tmp/mcp-publisher`): `login github` **device flow** (first try failed `incorrect_device_code`, retry succeeded) → `validate` OK → `publish` ✓ `io.github.crytobot459/eurorwa-analyst 1.0.0` → verify `GET /v0.1/servers?search=eurorwa` → status active, isLatest true.
  - **Note**: mcp-publisher lives in `/tmp` (lost on reboot) — re-download if updating later. CLI auth token stored locally.

**Still open (expansion opportunities):**

0. **README + public docs cleaned** (commit `d6069da`): removed all "free"/"free tier" mentions (Gemini free tier, Vercel free tier) from README.md, `llms.txt`, `SKILL.md`, `docs/posts.md`; README updated to current state (x402 API, MCP server + Registry, analytics, deploy hook).
1. **AgenticMarket — LIVE** (2026-08-07): user has API key `am_live_…` → set `AGENTICMARKET_SECRET` on Vercel (Sensitive, production) + redeploy. `x-agenticmarket-secret` gate tested live OK: no header → 401, correct key → 200 (initialize/resources/tools/call all pass), wrong key → 401. Submission doc: `docs/agenticmarket-submission.md`.
2. **Vercel Deploy Hook — CREATED** (commit pending): hook `eurorwa-pipeline` (branch main) → URL `https://api.vercel.com/v1/integrations/deploy/prj_DlHOyuXm7m3vywY29uFboYLDwtw5/FrAH8dG02p` (test trigger OK). GH Actions `pipeline.yml` already has "redeploy" step using secret `VERCEL_DEPLOY_HOOK` — **user needs to set GitHub secret** `VERCEL_DEPLOY_HOOK` = URL above (Settings → Secrets and variables → Actions) so the dashboard auto-redeploys after each pipeline commit.
3. ~~**agenticmarket.dev**~~ — merged into item 1 (LIVE).
4. Waiting for user to fund mainnet wallet `0x03fa9C…585c4` → resume self-settle (see Session 12) to index Bazaar + real revenue.
5. Update MCP server when adding new tools → bump version in server.json.

> ⚠️ **MCP Registry (`mcp-registry.com`) — DEAD (2026-08-07):** domain became Sedo parking, `api.mcp-registry.com` no longer responds. Listing `io.github.crytobot459/eurorwa-analyst` is moot — dropped from the plan. Main MCP channel is now AgenticMarket.

**Phase status:** P1-P6 + x402 + analytics + alerts + MCP server + **AgenticMarket (live gate)** done. Waiting on: funding buyer wallet on mainnet (index Bazaar + revenue) + setting GitHub secret `VERCEL_DEPLOY_HOOK`.

## Most recent session: 2026-08-06 (session 11)

**What was done — SETTLEMENT VIA CDP FACILITATOR + READY TO INDEX BAZAAR:**

- **Deployed 2 commits earlier**: `7eb1b06` (x402 + analytics + alerts) + `8cff89e` (renamed helpers to `_`-prefix) → repo `crytobot459/eurorwa` branch `main`. Vercel production `https://rwa-dashboard-gamma.vercel.app`, env `X402_PAYTO` + `X402_SKIP_BALANCE=1`. Real verification: `/api/analytics` 200, `/api/alerts` 200, `POST /api/analyst` no-pay → 402, `.well-known/*` 200, `/api/app` `/api/x402` → 404 (correct). E2E x402 production: valid payment → 200 + `PAYMENT-RESPONSE` deferred.
- **CDP validate production → `valid:true`, `simulation:accepted`** (only advisory: missing output example — added).
- **Registry + KYC research (done)**:
  - **Agentic.Market + Bazaar: NO KYC, NO manual registration** — auto-indexes when a real payment settles through the CDP facilitator (`api.cdp.coinbase.com/platform/v2/x402`), appears in `/v2/x402/discovery/resources?payTo=...` 15–30 minutes later. Discovery API **public** (search/resources/merchant).
  - **CDP `/verify` + `/settle` require JWT** (free Secret API Key at portal.cdp.coinbase.com/api-keys/secret) — confirmed by live test: 401 without auth.
  - **MCP Registry + agenticmarket.dev need a real MCP server** (not yet) — deferred. **Base builder-code** free: registered `bc_q4sqsqpy` for wallet `0x02B027…F846`.
  - **Indexing conditions clear**: (1) 402 with valid bazaar extension; (2) `paymentPayload.resource` MUST be present (CDP requires it, even if the spec doesn't); (3) extension must be echoed in the settle payload; (4) **v2 required** (extensions unsupported on v1); (5) **NO `discoverable` field** — CDP maintainer confirmed it breaks discovery; (6) payer ≠ payTo (avoid `self_send_not_allowed`).
- **Code `api/_x402.js`**:
  - **Bazaar extension fix**: removed `discoverable:true`, added `output.example` (real sample report) → exports `bazaarExtension()`.
  - **CDP facilitator settlement**: `cdpJwt()` (Ed25519 default / ES256 fallback, header `{alg,kid,nonce}`, claims `{sub,iss:"cdp",aud:["cdp_service"],nbf,exp,uri:"POST api.cdp.coinbase.com/platform/v2/x402/settle"}`, signed with Node `crypto` — no new dep); `facilitatorSettleBody()` (v2: `paymentPayload{resource,accepted,payload,extensions.bazaar}` + `paymentRequirements`); `facilitatorSettle()` POST `/settle` with `Authorization: Bearer <jwt>`, parses `EXTENSION-RESPONSES` header → `{bazaar:{status}}`.
  - `settlePayment` chain: CDP creds → CDP settle (fallback local on transport error) → none → local (`X402_KEY`) → none → `deferred`. `_app.js` passes `resource` into settle.
- **`.env.example`**: added `CDP_API_KEY_ID` / `CDP_API_KEY_SECRET` (free, with portal link).
- **`scripts/cdp-auth-check.js`**: smoke-tests JWT — calls `/verify` with garbage body, expects 400 instead of 401 (auth OK).
- **Tests**: x402-test **30 checks** (bazaar extension without `discoverable` + has output.example; JWT issue/claims/signature verify; settle body v2 correct shape), axis-test 21, typecheck clean.

**Still open:** (1) create a **free CDP Secret API Key** at portal.cdp.coinbase.com/api-keys/secret → set `CDP_API_KEY_ID`/`CDP_API_KEY_SECRET` on Vercel; (2) `scripts/cdp-auth-check.js` + self-settle once on Base Sepolia (ETH faucet quicknode.com/base/sepolia + USDC faucet.circle.com for a separate buyer wallet, payer ≠ payTo); (3) verify `GET /v2/x402/discovery/resources?payTo=0x02B027…F846` + `EXTENSION-RESPONSES` header; (4) optional mainnet (`X402_NETWORK=8453`) for real revenue.

- **Committed + deployed**: `d5bb7a4` (CDP facilitator settlement) + `b3cd003` (report quality) → production OK (no-pay 402, x402 manifest live).
- **Report quality fix (deployed)**: yield shows **"n/a"** instead of "0.00%" for funds missing data (EURC, NRW1, AAULF, bC3M, bIB01 — both LLM prompt + reason fallback); filtered non-ASCII crypto symbols (币安人生) from movers/trending → report regenerated + fresh on-chain attestation (`2026-08-06-analyst-4`, tx `0x025070…a7`).

## Session 12: 2026-08-06

**What was done — CDP KEY + FAUCET + EIP-712 DOMAIN MISMATCH FOUND (blocks testnet settle):**

- **CDP Secret API Key created + env set**: `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` (Sensitive/Production) on Vercel via `vercel env add --sensitive --value` (CLI v58 — DON'T use positional value, it gets parsed as gitBranch; use `--value` flag). Redeployed.
- **JWT smoke-test `scripts/cdp-auth-check.js` → AUTH OK** (400 schema reject instead of 401).
- **CDP Faucet works programmatically**: `POST https://api.cdp.coinbase.com/platform/v2/evm/faucet` (JWT like x402) — 1 USDC + 0.0001 ETH/request on Base Sepolia, no captcha. Used to fund the testnet buyer wallet.
- **CRITICAL finding — Base Sepolia USDC uses EIP-712 domain name "USDC" (not "USD Coin")**:
  - Real test: signature domain "USD Coin" → off-chain verify OK but `transferWithAuthorization` reverts on-chain with "FiatTokenV2: invalid signature".
  - Read `DOMAIN_SEPARATOR()` on-chain + compare: matches name="USDC" (doesn't match "USD Coin"). Mainnet Base USDC (0x8335…) still uses "USD Coin". Confirmed by x402-foundation constants + Solvela/Polyrank docs + Circle docs (Eco gasless).
  - **Fixed `api/_x402.js`**: `EIP712_NAME = NETWORK === "84532" ? "USDC" : "USD Coin"` (both `typedData()` + `requirements().extra`). Local `estimateContractGas` after fix: OK (102296 gas).
- **BUT CDP facilitator still dead-ends on testnet**: CDP `/settle` hardcodes "USD Coin" when validating → (a) "USD Coin" signature → CDP accepts but broadcast reverts → "unable to estimate gas"; (b) "USDC" signature → CDP rejects "invalid signature". ⇒ **Testnet CDP settle cannot succeed.**
- **Path forward: Base MAINNET** (both CDP + on-chain use "USD Coin"). Created mainnet buyer wallet `data/buyer-8453.key` (gitignored) = **`0x03fa9Cd74bE76C815DCaf079A31ed745028585c4`** — **waiting for user to fund ~$0.05 USDC + a little ETH**.
- `scripts/self-settle.js` refactored **network-aware**: imports `NETWORK/CHAIN_ID/ASSET/AMOUNT/requirements/typedData` from `_x402.js`, key file per network (`buyer-<NETWORK>.key`), auto-faucet only on testnet, uses `requirements(PAYTO)` for accepted. `scripts/_sim-twa.mjs` (transfer simulation debug) committed.

**Still open (once user funds the mainnet wallet):**

1. `vercel env add X402_NETWORK production --value 8453` (+ consider dropping `X402_SKIP_BALANCE` for real revenue; keep `=1` for self-settle) → deploy.
2. `X402_NETWORK=8453 SELF_SETTLE_PAYTO=0x02B027…F846 CDP_*… bun scripts/self-settle.js` → expect `EXTENSION-RESPONSES` bazaar status success/processing.
3. After 15–30 min check `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?payTo=0x02B027…F846` + Agentic.Market search.
4. If CDP mainnet settle hits gas errors → add ETH to the buyer wallet (CDP relay may not sponsor gas).

**Phase status:** P1-P6 + x402 + analytics + alerts done, deployed. Waiting on funding mainnet buyer wallet `0x03fa9C…585c4` for real settle + Bazaar index.

## Session 10: 2026-08-06

**What was done — MONETIZE + PRODUCT DIFFERENTIATION (x402 + Axis B + Axis C):**

- **x402 pay-per-call API — `POST /api/analyst`** (`api/x402.js` + `api/app.js`): hand-implemented x402 v2 spec with `viem` (no new dep, runs on Vercel Node):
  - No `PAYMENT-SIGNATURE` → **HTTP 402** + `PAYMENT-REQUIRED` header (base64: scheme, amount $0.05, network Base Sepolia `eip155:84532`, asset USDC, payTo `0x02B027…F846`, 30s expiry, bazaar extension `discoverable`).
  - Header present → verify (version/network/asset/amount/payTo, `verifyTypedData` EIP-712 TransferWithAuthorization, `balanceOf` unless `X402_SKIP_BALANCE=1`) → settle `transferWithAuthorization` via `X402_KEY` (if unset → `{status:"deferred"}` still returns report 200) → return report with `PAYMENT-RESPONSE` header.
- **Axis B — institutional analytics — `GET /api/analytics`** (`api/analytics.js`): total TVL, concentration (top3/5/10 + HHI), breadth (median/max/min yield, spread), currency split USD/EUR/GBP, chain footprint, issuer concentration, holders, top-10 day flows. Computed on-the-fly from snapshot, no new data source needed.
- **Axis C — alerts — `GET /api/alerts`** (`src/analyst/alerts.ts` + `scripts/alerts.ts`): 5 alert types `yield-breakout`/`yield-cohort`/`tvl-spike`/`holder-surge`/`regime-flip` (severity info/warning/high). Script dedupes by id `type-ticker-date`, keeps latest 60 → `data/alerts.json`, posts warning/high to Telegram group. **Ran for real: 2 alerts, 1 warning posted** (USYC holder exit -11.63%). Wired into `scripts/run.sh`.
- **Discovery for agents/registry**: `public/.well-known/x402.json`, `public/.well-known/agent-services.json` (Rail402-compatible), `public/SKILL.md`, `public/llms.txt` (built by Vite copy into `public/`).
- **Frontend 6 tabs**: added **analytics** + **alerts** (bar concentration, chain/issuer footprint, currency split, top flows; colored severity chips). Build OK (537KB).
- **All tests green**: `scripts/x402-test.js` (15 checks: 402 flow, header decode, valid payment→200, expired/wrong amount/wrong payTo/garbage sig→402, deferred settlement) + `scripts/axis-test.js` (21 checks: analytics math, all 5 alert types, live endpoints). Scripts `alerts`, `x402-test`, `axis-test` added to `package.json`.
- **Vercel deploy FIX**: Vercel auto-exposes every `api/*.js` file as its own function → `api/analytics.js` swallowed route `/api/analytics` (crash 500 "Invalid export"), and `POST /api/analyst` reported "x402 not configured" due to missing env. Fix: renamed helpers to `_`-prefix (`_app.js`, `_analytics.js`, `_x402.js`, `_verify.js`, `_tgbot.js`, `_freelance.js`) — per Vercel docs `_`-prefix files don't become functions; updated all imports (main.ts, tg.ts, src/api.ts, test scripts). Set env `X402_PAYTO` + `X402_SKIP_BALANCE=1` on Vercel.

**Still open (next session):** commit+push repo (with `data/alerts.json` for production `/api/alerts`), deploy Vercel, verify live endpoints, register on Bazaar/Base MCP (payTo `0x02B027…F846`), test mainnet settle when `X402_KEY` available.

**Phase status:** P1-P6 done. Pipeline + bot + onchain attestation + **paid x402 API + institutional analytics + alerts** all running locally. Waiting: commit, deploy, registry registration.

## Most recent session: 2026-08-05 (session 9)

**What was done:**

- **REAL BOTS + REAL GROUP — RUNNING END-TO-END ✓**:
  - Created 2 bots via @BotFather (headless Chrome + CDP, real Telegram session):
    `@EuroRWA_Data_bot` (TG_TOKEN) and `@EuroRWA_Build_2026_bot` (TG_FREELANCE_TOKEN, old username `EuroRWA_Build_bot` was taken).
  - Created group **"EuroRWA Bots Hub"** `GROUP_CHAT_ID=-5127324366` (owner + 2 bots).
  - `OWNER_CHAT_ID=444148694` (eleven/@crytobot459). Tokens/group saved in `data/tg-bots.json` + `.env.local` (gitignored, not committed).
  - **Vercel**: set env (TG_TOKEN, BUILD_BOT_USERNAME, GROUP_CHAT_ID) → deploy → set webhook `https://rwa-dashboard-gamma.vercel.app/api/tg`.
  - **Vercel routing fix**: `vercel.json` rewrite `/api/:path*` → `/api/main` swallowed `/api/tg` too → added `/tg` route to Hono `api/app.js` (`app.post("/tg", webhook)`). Deployed.
  - **Public bot verify**: owner `/start` → help reply; "I need a dashboard built" (VN) → quoted `dashboard: $80-150` + link `https://t.me/EuroRWA_Build_2026_bot?start=build` + `#[lead]` in group. ✓
  - **Build bot verify (local long-polling)**: `/start` → welcome; task description → quoted `$115`; `ok` → USDT TRC20 address `TPVSnUZg...`; fake tx hash → **Binance auto-verify correctly rejects** ("no transaction seen" VN) + creates task + `#[task]` in group; owner `/approve msfzjhdo-753` → `#[approved]`. ✓
- **BUGS FIXED**:
  - `api/app.js` was missing `/tg` route (swallowed by Vercel rewrite) → added.
  - Build bot: `getUpdates` loop crashed on non-`message` update (`my_chat_member`) → skip `!upd.message`.
  - Build bot: owner `/start` was swallowed by owner-command branch ("Owner commands: ..." failed to send because it contained `<id>` unescaped in HTML parse_mode) → owner branch now only matches `/^\/(approve|reject|tasks)/` + escapes `&lt;id&gt;`.
- **IMPORTANT FINDING — Telegram limitation**: a bot **cannot see messages from other bots** (both in group and private DM: `USER_BOT_TO_BOT_DISABLED`; even disabling privacy mode via BotFather doesn't help). → `#[ack]` from build bot doesn't auto-fire when data bot posts `#[lead]`. **Actual architecture**: the customer clicks the deep link to the build bot themselves (no bot→bot handoff). Shared group = **audit log for the owner** (`#[lead]` data bot + `#[task]`/`#[approved]` build bot). Updated `docs/FREELANCE-FLOW.md`.
- **Still open**: commit+push repo (secrets excluded), post LinkedIn `docs/posts/ready-2026-08-05.md`, run build bot locally when needed (`bun run freelance` uses `--env-file`).

**Phase status:** P1-P6 done. 2-bot system + group + Binance auto-verify **running for real end-to-end**. Remaining: commit, post, find first customer (P7).

## Previous recent session: 2026-08-05 (session 8)

**What was done:**

- **2 agents talking to each other — COMPLETE** (public bot ↔ build bot):
  - `api/freelance.js` (new): price list + `classify` + `quickQuote` shared by both bots (runs on Vercel).
  - Public bot (`api/tgbot.js`): added `detectBuild()` — when a customer shows intent to place a task → returns Q&A + **quick quote** + link `t.me/<build_bot>?start=build` + posts `#[lead]` in the shared group. Ignores group messages (only handles private chats).
  - Build bot (`scripts/freelance-bot.js`): handles `#[lead]` from group → replies `#[ack]`; posts `#[task]` when creating a task and `#[approved]` when owner approves; owner can approve from within the group; handles `/start build` (deep link).
  - `scripts/freelance-core.js`: uses shared `classify`/`midPrice` from `api/freelance.js`.
  - Extended tests (`scripts/freelance-test.js`): detectBuild + quickQuote + happy path + quote + owner — pass, typecheck clean.
  - **2-agent connection mechanism**: shared Telegram group (`GROUP_CHAT_ID`, both bots are members) — protocol `#[lead]`/`#[ack]`/`#[task]`/`#[approved]`. Because Telegram forbids bots messaging strangers first → public bot provides the link, customer clicks `/start` with the build bot themselves.
  - `docs/FREELANCE-FLOW.md` + `.env.example` updated: `BUILD_BOT_USERNAME`, `GROUP_CHAT_ID`.

**Phase status:** P1-P6 done. Automated pipeline + auto-deploy Vercel working. **2 freelance bots now talk to each other through the shared group.** Waiting on user: (1) create 2 bots + group, set env (Vercel: `TG_TOKEN`, `BUILD_BOT_USERNAME`, `GROUP_CHAT_ID`; local: `TG_FREELANCE_TOKEN`, `OWNER_CHAT_ID`, `USDT_ADDRESS`, `GROUP_CHAT_ID`), (2) run build bot locally, (3) post LinkedIn + log link.

## Session 5: 2026-08-05

**What was done:**

- **Visual chart generator**: `src/visual.ts` + `bun run visual` — generates 1200×630 PNG chart (dark theme, top-8 funds TVL bars, yield chips, onchain-verified badge) via headless Chrome (`/usr/bin/google-chrome`, no npm dep) → `docs/posts/visual-<date>.png` + `.html`. Wired into `scripts/run.sh` (12h cron auto-generates fresh image).
- **LinkedIn long-form upgrade**: `src/posts.ts` now generates quality LinkedIn posts (~1480 chars): hook → THE NUMBERS (top 5 bullets with yield) → WHY THIS MATTERS → THE PART I COULDN'T GET ANYWHERE ELSE (keccak-256 → sign → publish Sepolia story) → WHAT THE DATA SAYS RIGHT NOW (7d movers) → CTA. Header in `ready-<date>.md` points to `visual-<date>.png`.
- **Commit + PUSH GitHub succeeded**: 4 commits (04ad434, 1d3eaa4, 005c74c, ecf0652) to `main` → https://github.com/crytobot459/eurorwa (used old token via temporary credential helper, not stored in remote URL/history). Public repo now has: contract, attestation, posts generator, visual generator.
- **Product ready to post**: `docs/posts/ready-2026-08-05.md` (X/Reddit/LinkedIn) + image `docs/posts/visual-2026-08-05.png`.
- **FIXED on-chain data mismatch (important)**: 12:00 cron re-ran → `attest.ts` generated a new hash (payload includes `generated_at`) → but contract fixes the date (`require date already attested`) so it couldn't publish → attestation file drifted from on-chain. Fixed:
  - **Deployed new contract** `0xd482a715cdef4073593f4a3208abd328f6d71725` + published 2026-08-05 attestation (hash `0xeb0e...eeed`) → 100% on-chain match. Tx: https://sepolia.etherscan.io/tx/0x61afb801bb03f1e4de7c32ab42b7763cf1e40a734f25105ba5dc239c9a21a3f0
  - `src/agent/guard.ts`: blocks re-attest when the date already exists on-chain (only the first run of the day is canonical).
  - `publish.ts`: writes `published.tx/block/contract` into the attestation file.
  - `posts.ts`: LinkedIn post includes tx + contract + hash — concrete proof.

**Phase status:** P1-P5 complete, P6: public repo + post + image done, **waiting on user to post + log link**. Next: post LinkedIn long-form + chart image.

## Session 4: 2026-08-05

**What was done:**

- **Bonus Sepolia contract DEPLOY SUCCESSFUL** 🎉:
  - User claimed pk910 faucet 0.056 SepETH (manual mining ~few minutes). First `INVALID_ADDR` error was from pasting address with extra hidden characters — server accepts the standard address (direct API test).
  - **Contract**: `0xcb03f6390ef54aaa1a39ef9f71448a23ccca3b7f` (Sepolia) — deploy tx `0x807e...a60565`.
  - **Onchain attestation**: date `2026-08-05`, tx `0x6f8e...fb72c` (block 11421710). Verified by reading `getHash()` matches `0x3fda...869c`, owner = agent wallet. View: https://sepolia.etherscan.io/tx/0x6f8ec37095093d9097eae89265e9f086eec09b754c7d0120eff288fe9e2fb72c
  - **Bug fixed**: `deployContract` (viem) returns the **tx hash**, not the address → `deploy.ts` now `waitForTransactionReceipt` + reads `contractAddress`. (First orphaned contract harmless.)
- **AUTOMATED POST GENERATOR**: `src/posts.ts` + `bun run posts` — reads latest snapshot, computes total TVL / top funds / top yield / 7d mover, generates 3 ready posts (X ≤280 chars, Reddit title+table, LinkedIn) → `docs/posts/ready-<date>.md`. **User just opens the file, copy-pastes, posts.** Wired into cron (regenerates every 12h with new data). Example: `docs/posts/ready-2026-08-05.md` (X post 248/280).
- **12h cron INSTALLED**: added crontab job `0 */12 * * *` running `scripts/run.sh` (fetch + ingest + attest + publish onchain + generate posts) → logs to `data/cron.log`. Manual run verified OK (15 funds, idempotent upsert). Old crontab backed up at `/tmp/crontab.backup.*`.
- **5 sample posts written** in `docs/posts.md` (Posts 1-5: EU capital flows, yield comparison, new funds, monthly summary, build story) — with REAL 2026-08-05 snapshot numbers (total $10.6B, USYC $3.0B, BUIDL $2.7B, EUTBL $898M, USTBL 4.34%...). User posts manually via Chrome, logs link in PROGRESS after.
- **Attestation refreshed** with new data (after re-running fetch/ingest): hash `0x3fda...869c`, verify OK.

**Phase status:** P1-P5 fully complete (incl. bonus Sepolia contract), P4 deployed public, P6 posts written (not posted). Remaining: post 5 posts + log links, expand WATCH list when needed.

## Session 3: 2026-08-05

**What was done:**

- **WATCH LIST EXPANDED 11 → 15 funds** (real data): added USTBL (Spiko US T-Bills, EU-domiciled, $145.5M), AAULF (abrdn Liquidity Fund Lux USD, $16M), bIB01 (Backed IBTA $ Treasury 0-1yr), EUROB (Etherfuse). Updated `mock()` fallback to match. Re-fetch + ingest → 15 funds, 15 rows.
- **Phase 5 — Onchain attestation COMPLETE** (scripts ran for real):
  - `src/agent/attest.ts`: reads SQLite → payload 15 funds (ticker/slug/tvl/yield/holders) → `keccak256` → signed with viem (`privateKeyToAccount`), wallet auto-created on first run saved to `data/agent.key` (mode 600, gitignore) → writes `data/attestations/<date>.json` `{date, signer, hash, signature, payload}`.
  - `src/agent/verify.ts`: re-hashes payload + `recoverAddress` → compares signer. **Catches tampering** (change 1 TVL value → "HASH MISMATCH — payload tampered", exit 1). Missing file → clear error, exit 1.
  - Tests: attest → verify OK (signer `0x02B0...F846`, 15 funds), typecheck clean.
- **Deploy scaffold ready for Vercel** (waiting for user `vercel login`):
  - **Refactored API away from `bun:sqlite`** → `api/app.js` (pure JS, reads `data/snapshots/*.json` directly, runs on both Bun and Node serverless — critical because Vercel functions are Node). `src/api.ts` wrapper serves :3000. 4 endpoints keep shape (tests pass again).
  - `api/main.ts`: Vercel handler strips `/api` prefix → `app.fetch`.
  - `vercel.json`: build frontend → `public/`, `build.env VITE_API=/api`, rewrites `/api/:path*` → `/api/main`.
  - `vite.config.ts`: outDir `../../public`. `public/` gitignored (generated by Vercel build).
  - `.gitignore`: removed `data/snapshots/` (commit so deploy has data), added `public/`, `data/agent.key`.
- **PUBLIC DEPLOY SUCCESSFUL — https://rwa-dashboard-gamma.vercel.app**:
  - User `bunx vercel login` → `bunx vercel --prod`. Project `crytobot/rwa-dashboard`.
  - **3 Vercel bugs fixed**: (1) `outputDirectory` made Vercel ignore `api/` functions → removed; (2) `api/index.ts` only matched exactly `/api`, subpaths CDN-404 → use rewrites `/api/:path*` → `/api/main`; (3) helper `.ts` not compiled by Vercel (Node ESM won't load `.ts`) → moved app to `api/app.js` (pure JS) + `api/app.d.ts` for types. And `env` in vercel.json doesn't enter build-phase → moved to `build.env` so `VITE_API=/api` is baked into the bundle.
  - **Production verify**: `/api/funds` 15 funds (USYC $3.01B top), `/api/yields` (CETES 4.6%, USTBL 4.34%), `/api/funds/:slug` EUTBL history, `/api/flows`, 404, index 200, bundle contains `/api`.
- **PUBLIC GITHUB REPO — https://github.com/crytobot459/eurorwa**:
  - `git init -b main` + commit (30 files, inline user without editing git config). Excluded `src/frontend/dist/` (old build) from staging + gitignore.
  - Pushed `main` to `crytobot459/eurorwa` (public). Remote URL clean (no embedded token).
  - **Verify**: 30 files on GitHub, no `agent.key`/`.env`/`rwa.db`. Snapshot `data/snapshots/2026-08-05.json` committed (needed for deploy).
- **Previous session**: switched to scraping real data (11 funds), removed mock, rebuilt DB.

**Phase status:** P1-P5 (code) done with real data, **P4 deployed public**. Missing: 12h cron, bonus Sepolia contract, Phase 6 (post + public repo).

## Master checklist

- [x] P1: environment setup
- [x] P2: fetch + ingest + SQLite history — real web data
- [x] P3: API 4 endpoints — real data
- [x] P4: frontend + public deploy — **https://rwa-dashboard-gamma.vercel.app**
- [x] P5: attest.ts + verify.ts + **bonus Sepolia contract** (contract `0xcb03...3b7f`, onchain attest 2026-08-05)
- [~] P6: public repo + posts generator + 5 sample posts + chart image done (`docs/posts.md`, `docs/posts/ready-2026-08-05.md`, `visual-2026-08-05.png`) — not yet posted
- [ ] P7: first customer / grant
- [ ] P8: expansion (optional)

## Next steps (for next session)

1. **Post** `docs/posts/ready-2026-08-05.md` to X/Reddit/LinkedIn with `visual-2026-08-05.png` + log link in PROGRESS.
2. **Vercel Deploy Hook**: create hook in Vercel (Project Settings → Deploy Hooks) → give URL to agent to set secret `VERCEL_DEPLOY_HOOK` → dashboard auto-redeploys after each pipeline commit.
3. **Add funds**: expand WATCH list (Libeara, Cashlink EU funds...) when needed.
4. **Git credential**: pushing via temporary credential helper still works; should `gh auth login` when free; **revoke old token** `ghp_AHT0...` since it was exposed in history. `gh` CLI installed standalone at `~/.local/bin/gh` (uses `GH_TOKEN` env).
5. **Monetize**: Gumroad "EU RWA Monthly" PDF, API subscription — when there's traffic.

## Notes

- Data is **real** (scraped from public pages rwa.xyz, source:"rwa.xyz-web"). If rwa.xyz changes page structure → `fetch.ts` has mock fallback + needs log check.
- **12h cron** runs fetch+ingest locally (log `data/cron.log`). **GH Actions** runs in parallel on GitHub server (cron `30 0,12 * * *` + dispatch) — guard blocks same-day re-attest so no conflict. GH Actions commits new snapshots back to repo; Vercel redeploy waits for Deploy Hook.
- API deploy reads `data/snapshots/*.json` (no SQLite needed) — commit snapshot so deploy has data.
- Never commit: `.env.local`, `data/rwa.db`, `data/agent.key`.
- Local API: `bun run src/api.ts` → localhost:3000. Frontend dev: `cd src/frontend && bun run dev` → localhost:5173. Build: `cd src/frontend && bun run build` → `public/`.
- Frontend bundle 523KB (recharts) — code-split later if needed.
