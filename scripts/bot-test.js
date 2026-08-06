import { replyFor } from "../api/_tgbot.js"

const cases = [
  "/today",
  "/funds",
  "/yields",
  "/movers",
  "/proof",
  "/suggest Great analysis on tokenized treasuries, keep it up!",
  "usyc",
  "what's the top yield right now?",
  "/help",
]

for (const c of cases) {
  console.log(`\n>>> ${c}`)
  console.log(replyFor(c))
}
