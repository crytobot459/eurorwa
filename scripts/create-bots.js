import { getWs, reload, openChat, sendMsg, lastMsgText } from "./tg-helpers.js"

function extractToken(txt) {
  const m = txt.match(/\b\d{8,10}:[A-Za-z0-9_-]{30,40}\b/)
  return m ? m[0] : null
}

const bots = [
  { name: "EuroRWA Data", username: "EuroRWA_Data_bot" },
  { name: "EuroRWA Build", username: "EuroRWA_Build_bot" },
]
const results = []

const ws = await getWs()
await reload(ws)
await openChat(ws, "BotFather")

for (const bot of bots) {
  console.log(`\n=== ${bot.name} (@${bot.username}) ===`)
  const r1 = await sendMsg(ws, "/newbot")
  console.log("1:", r1.slice(0, 60))
  if (!/Alright/i.test(r1)) throw new Error("expected name prompt, got: " + r1.slice(0, 100))

  const r2 = await sendMsg(ws, bot.name)
  console.log("2:", r2.slice(0, 60))
  if (!/username/i.test(r2)) throw new Error("expected username prompt, got: " + r2.slice(0, 100))

  let r3 = await sendMsg(ws, bot.username)
  console.log("3:", r3.slice(0, 60))
  if (/taken|unavailable|invalid/i.test(r3)) {
    const alt = bot.username.replace("_bot", "2026_bot")
    console.log("trying alt:", alt)
    r3 = await sendMsg(ws, alt)
  }

  const token = extractToken(r3)
  if (!token) throw new Error("no token in reply: " + r3.slice(0, 300))
  console.log("TOKEN:", token)
  results.push({ name: bot.name, username: bot.username, token })
  await new Promise((r) => setTimeout(r, 1500))
}

await Bun.write("data/tg-bots.json", JSON.stringify(results, null, 2))
console.log("\nsaved data/tg-bots.json")
process.exit(0)
