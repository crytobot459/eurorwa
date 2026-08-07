# BOT-FLOW — EuroRWA pipeline operation flow

The pipeline automates everything: fetch data → verify on-chain → write posts → deploy. It runs independently on GitHub servers, so it **works even when your machine is off**.

## 1. Triggers

| Source                    | Schedule                                                 | Purpose                       |
| ------------------------- | -------------------------------------------------------- | ----------------------------- |
| Local cron (user machine) | `0 */12 * * *` (00:00, 12:00)                            | Runs when machine is on       |
| GitHub Actions            | `30 0,12 * * *` (00:30, 12:30 UTC) + `workflow_dispatch` | Runs even when machine is off |

The 30-minute offset avoids both flows running at once (the guard blocks duplicate attestations anyway, so overlap isn't harmful).

## 2. Processing chain (`scripts/run.sh`)

```
fetch.ts   → calls rwa.xyz, gets TVL/yield/holders for 15 funds → data/snapshots/<date>.json
ingest.ts  → reads snapshot, writes into SQLite (data/rwa.db)
guard.ts   → checks on-chain: is this date already attested?
              ├─ attested      → exit (keep the canonical version on-chain)
              └─ not attested  → attest.ts + publish.ts
attest.ts  → hashes snapshot (keccak-256) + signs with agent wallet → data/attestations/<date>.json
publish.ts → sends hash + signature to the Sepolia contract → writes published.tx into attestation file
posts.ts   → generates ready.md (X/Reddit/LinkedIn posts) into docs/posts/<date>/
visual.ts  → builds chart HTML → screenshots PNG with headless Chrome → docs/posts/<date>/visual.png
```

Then (GitHub Actions only):

```
commit + push → if there are changes: commit snapshot + posts + image back to repo main
redeploy      → if there's a new commit: call Vercel Deploy Hook → site auto-updates
```

## 3. Agent wallet & security

- Signing wallet = address `0x02B027ecd3004Fbb579bD4c64B6e22Fff369F846`
- Key lives in `data/agent.key` (local) **or** env `AGENT_PRIVATE_KEY` (GitHub Actions secret `AGENT_PRIVATE_KEY`)
- Both places use **the same key** → signatures are consistent between local and GitHub
- Never commit `data/agent.key`, `.env*`, `data/rwa.db`

## 4. Guard against same-day duplicate attestation

The contract only accepts **1 attestation/day** (`require date already attested`). Without the guard, a second cron run would produce a different hash (payload includes `generated_at`) → on-chain mismatch. The guard reads the contract before attesting:

- Hash for the date already exists → `exit 1` → keep the canonical version (published on first run)
- Not present → `exit 0` → attest + publish fresh

→ Only the **first run of the day** becomes the canonical on-chain version.

## 5. Data & deploy

- Vercel API reads `data/snapshots/*.json` directly (no SQLite needed)
- Snapshot is committed to the repo → Deploy Hook → Vercel rebuild → dashboard shows new data
- Dashboard: https://rwa-dashboard-gamma.vercel.app
- Repo: https://github.com/crytobot459/eurorwa

## 6. When something breaks — where to look

| Symptom                               | Where to look                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| No file in `docs/posts/<date>/` today | `data/cron.log` (local) or GitHub → Actions → pipeline                                                                                |
| Attestation not published             | `data/attestations/<date>.json` missing `published.tx` → check tx error on Sepolia scan                                               |
| Site doesn't show new data            | Did GitHub Actions commit? Did the Vercel hook run?                                                                                   |
| Image not generated                   | Chrome busy (many tabs open) — visual.ts has its own `--user-data-dir` + 30s timeout, errors only warn, they don't block the pipeline |

## 7. Manual run for testing

```bash
bun run fetch && bun run ingest
bun run posts      # generate posts
bun run visual     # generate image
bun run verify     # verify attestation matches signature
bun run scripts/bot-test.js  # test bot logic (no token needed)
```

## 8. Telegram bot (agent chats with customers)

- Endpoint: `POST /api/tg` (Telegram webhook on Vercel) — `api/tg.ts` + `api/tgbot.js`
- Answers from `data/snapshots/*.json` + `data/attestations/*.json` (fresh data each time the pipeline redeploys)
- Commands: `/today`, `/funds`, `/yields`, `/movers`, `/proof`, `/suggest <comment>`, or just type a fund name / question
- Token: read from env `TG_TOKEN` (set in Vercel → Settings → Environment Variables)
- Register webhook: `TG_TOKEN=... bun run scripts/tg-webhook.js https://rwa-dashboard-gamma.vercel.app/api/tg`
- Test locally: `bun run scripts/bot-test.js`
