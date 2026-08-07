# EuroRWA — Freelance Flow

Flow for taking freelance tasks from customers **inside rwa-dashboard itself** — customer sees the
LinkedIn post/dashboard → contacts via Telegram bot → local machine quotes → receives 100%
upfront → opencode does the work → handover.

## Principles

- **Two bots working together**:
  - **Public bot** `TG_TOKEN` (Vercel webhook, always online): answers data Q&A,
    detects when a customer wants to place a task → gives a quick quote + link to the build
    bot chat → sends `#[lead]` to the shared group.
  - **Build bot** `TG_FREELANCE_TOKEN` (local long-polling): customer clicks the `/start` link
    → takes the task itself, quotes, closes, receives USDT → creates task → posts status to the group.
- **Shared Telegram group** (`GROUP_CHAT_ID`, both bots are members) = **audit log for the owner**:
  the public bot posts `#[lead]`, the build bot posts `#[task]` and `#[approved]`. The owner approves (`/approve`) from a private chat or inside the group.
- **IMPORTANT — Telegram limitation**: a bot **cannot see messages from other bots** (neither in the
  group nor in private DM; disabling privacy mode via BotFather doesn't help either). So the build
  bot **can't see** `#[lead]` posted by the public bot on its own (the `#[ack]` handler only runs
  when the _owner_ manually posts `#[lead]`). **Customer → build bot handoff is user-initiated**:
  the customer clicks the deep link `t.me/<build_bot>?start=build`. No bot→bot coordination is
  needed to run the flow.
- **Payment**: 100% upfront, USDT TRC20 to the owner's Binance wallet.
- **Runs to completion automatically**: bot takes tasks, quotes, and closes on its own; the owner
  only confirms receipt of payment (`/approve`). Only asks the owner when stuck (price out of range, special task).

## Architecture

```
Customer chats the public bot (Vercel)
   → detectBuild? → return Q&A + estimated price + link t.me/<build_bot>?start=build
   → post #[lead] to the shared group
Customer clicks the link → /start with the build bot (local long-polling)
   → scripts/freelance-bot.js (getUpdates + sendMessage loop)
   → scripts/freelance-core.js (pure state machine: scope → quote → pay → task)
   → data/freelance/tasks.json (task awaiting approval) + #[task] in group
Owner types /approve <id> (private chat or in group) → #[approved] → opencode reads the task → code → handover
```

Group message flow between the 2 bots (protocol `#[tag]`):

| Message                                           | Meaning                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `#[lead] <chat_id>\|<name>\|<description>`        | public bot reports a customer wants to place a task (audit log for the owner)                              |
| `#[ack] <chat_id>`                                | build bot confirms — **only when the owner posts `#[lead]` manually** (bot can't see other bots' messages) |
| `#[task] <id> — $<price> (<cat>) — <description>` | build bot created a task, awaiting owner approval                                                          |
| `#[approved] <id> — $<price>`                     | owner approved, work started                                                                               |

- `api/freelance.js`: price list + `classify` + `quickQuote` shared by both bots.
- `api/tgbot.js`: public bot — added `detectBuild` + sends lead.
- Local build bot only handles private chats + owner commands in the group; doesn't respond to other group messages.
- The build bot can't see `#[lead]` from the public bot (bots can't see other bots' messages) — handoff via deep link.

## Setup

1. Create 2 bots via @BotFather → token → `TG_TOKEN` (public bot), `TG_FREELANCE_TOKEN` (build bot).
2. Owner's Telegram chat id → `OWNER_CHAT_ID` (owner = the one approving tasks; currently `444148694`).
3. Binance wallet address receiving USDT (TRC20) → `USDT_ADDRESS`.
4. Create a dedicated Telegram group (e.g. "EuroRWA Bots Hub"), **add both bots + the owner** →
   `GROUP_CHAT_ID` read from `location.hash` when you open the group (e.g. `#-5127324366` → `-5127324366`).
5. `BUILD_BOT_USERNAME` = build bot username (without @) — so the public bot can build the link.
   - `TG_TOKEN`, `BUILD_BOT_USERNAME`, `GROUP_CHAT_ID` go on **Vercel** (public bot).
   - `TG_FREELANCE_TOKEN`, `OWNER_CHAT_ID`, `USDT_ADDRESS`, `GROUP_CHAT_ID` set when running locally.
6. Set the webhook for the public bot:
   ```bash
   TG_TOKEN=... bun run scripts/tg-webhook.js https://rwa-dashboard-gamma.vercel.app/api/tg
   ```
7. Run the build bot locally:
   ```bash
   bun run freelance   # = bun --env-file=.env.local run scripts/freelance-bot.js
   ```

## Conversation flow (state machine)

| Step | Customer types                   | Bot replies                                              |
| ---- | -------------------------------- | -------------------------------------------------------- |
| 1    | `/start`                         | Price list by task type                                  |
| 2    | task description (1-2 sentences) | Type + self-quoted price (mid-range)                     |
| 3    | `ok` / counter-offer             | Lock price / one-time 20% discount                       |
| 4    | tx hash or screenshot            | "Received, owner confirms" → create task + message owner |
| 5    | (owner) `/approve <id>`          | Work starts                                              |

### Price list (auto-classified by keyword, `api/freelance.js`)

| Type                     | Price    |
| ------------------------ | -------- |
| dashboard / frontend     | $80-150  |
| Telegram/Discord bot     | $80-150  |
| data / API / scrape      | $40-100  |
| smart contract / onchain | $150-300 |
| small script / tool      | $30-60   |
| other                    | $50-100  |

## Owner commands (type in a private chat with the build bot or in the shared group)

- `/tasks` — list tasks awaiting approval
- `/approve <id>` — confirm payment received → officially take the work
- `/reject <id>` — reject (customer didn't transfer enough)

## Work loop

1. Build bot receives task + proof → writes `data/freelance/tasks.json` → messages owner + `#[task]` in the group.
2. Owner checks the money in Binance (USDT TRC20 matching `USDT_ADDRESS`).
3. Owner types `/approve <id>` (private chat or in the group) → bot tells the customer + `#[approved]`.
4. Owner opens opencode in `rwa-dashboard`, asks the agent to handle the task with that id
   (or reads `data/freelance/tasks.json` directly).
5. Agent finishes the code → owner sends the file/image to the customer via Telegram → close the task.

## Notes

- The build bot runs **on the local machine** — if the machine is off, leads aren't processed; when
  restarted it still receives new messages (Telegram keeps updates 24h for long-polling).
- Telegram rules: a bot **can't message strangers first** — that's why the public bot
  gives a link so the customer clicks `/start` with the build bot themselves; you can't "push" the customer over.
- `data/freelance/` is in `.gitignore` (tasks + proof are not pushed to the repo).
- Don't auto-post/reply on LinkedIn (ToS risk) — only use the bots as a task intake channel.
