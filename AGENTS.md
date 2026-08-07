# AGENTS.md — EuroRWA Agent

Instructions for **every opencode session** working in this project.
Read this file FIRST, then `ROADMAP.md`, then `PROGRESS.md`.

## Mission

The agent's task is to complete the **EuroRWA dashboard**:
a dashboard tracking European tokenized money-market funds
(BlackRock/JPMorgan just opened $311B), with an integrated **on-chain AI agent**
that publishes data attestations to the blockchain. End goal: make money
by selling API/data → grant → job.

## Session start (required)

When starting a new session:

1. Read `ROADMAP.md` (entirely)
2. Read `PROGRESS.md` (if present) — see where the last session left off
3. Identify the in-progress phase, continue from there (don't redo)

At the end of the session:

1. Update `PROGRESS.md`: which phases are done, note the Done criteria ticked
2. Clearly note "next steps to do" for the next session

## Working rules

- **Follow the ROADMAP phase order**, don't skip unless PROGRESS.md explains why
- **Each phase has Done criteria** — only move on after the checklist is ticked
- **Post/showcase early** (from Phase 2 onward) — don't hide the product until "perfect"
- **Cost $0-15/month** — don't add paid dependencies/cloud without a reason
- **Each session should complete one full phase** rather than leaving many half-done

## Code conventions (inherited from repo root AGENTS.md)

- Single-word variables: `const db`, `const cfg` — no long `camelCase` unless truly needed
- No `any`
- Avoid try/catch unless needed
- Use Bun APIs: `Bun.file()`, `bun:sqlite`
- Prefer type inference, `const` over `let`, early return over `else`
- snake_case for DB columns

## Project structure

```
rwa-dashboard/
├── ROADMAP.md          # 8-phase roadmap (read first)
├── AGENTS.md           # This file
├── PROGRESS.md         # Status — update every session
├── docs/
│   ├── research-rwa-data.md       # RWA data research
│   ├── research-onchain-agent.md  # AI agent onchain research
│   ├── research-monetization.md   # Monetization + post templates
│   └── posts/                     # Sample posts (Phase 6)
├── src/
│   ├── fetch.ts        # Get data from rwa.xyz + etherscan
│   ├── ingest.ts       # Write into SQLite
│   ├── api.ts          # API endpoints
│   ├── frontend/       # React dashboard
│   └── agent/
│       ├── attest.ts   # Sign + publish onchain attestation
│       └── verify.ts   # Verify signature
├── api/
│   ├── app.js          # Data API (reads snapshot JSON)
│   ├── tg.ts           # Telegram webhook entry /api/tg
│   ├── tgbot.js        # Public bot Q&A + detectBuild + send lead
│   └── freelance.js    # Price list + classify + quickQuote (shared by 2 bots)
├── scripts/
│   ├── freelance-core.js  # Task intake state machine (pure, testable)
│   ├── freelance-bot.js   # Local build bot (long-polling) takes tasks
│   └── freelance-test.js  # Freelance flow tests
└── data/
    ├── snapshots/      # JSON per day
    ├── rwa.db          # SQLite
    ├── freelance/      # tasks.json + state.json (gitignore)
    └── attestations/   # Hash + signature per day
```

## Main data sources

- **rwa.xyz API**: `https://api.rwa.xyz/v4/assets` — Bearer token `RWA_API_KEY`
  (register at app.rwa.xyz → API Tools → API Keys)
- **rwa.xyz MCP**: `https://mcp.rwa.xyz` (OAuth — for AI assistants)
- **Docs**: https://docs.rwa.xyz/llms.txt (full index)
- **Etherscan API**: free, 5 req/s
- **Key internal doc**: ROADMAP Phase 5 details how to do attestation

## Security warnings

- **NEVER** commit `.env.local`, agent private key, `RWA_API_KEY`
- Private key for attestation: create a new EVM wallet dedicated to the agent, used only for signing,
  never funded
- `.gitignore` must include: `.env*`, `data/rwa.db`, `data/attestations/`, `data/snapshots/`

## Priority order when a session is time-constrained

1. Update PROGRESS.md (always do first at the end)
2. Complete the in-progress phase
3. Build one small feature in the current phase
