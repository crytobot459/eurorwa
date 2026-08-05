import { getWs, reload, openChat, scrollBottom, lastMsgText, sendMsg } from "./tg-helpers.js"

function extractToken(txt) {
  const m = txt.match(/HTTP API:(\d{8,10}:[A-Za-z0-9_-]+)Keep/)
  if (m) return m[1]
  const m2 = txt.match(/\b(\d{8,10}:[A-Za-z0-9_-]{35})(?=Keep|\s|$)/)
  return m2 ? m2[1] : null
}

const ws = await getWs()
await reload(ws)
await openChat(ws, "BotFather")
await scrollBottom(ws)
await new Promise((r) => setTimeout(r, 1500))

const results = []

const first = await lastMsgText(ws)
const t1 = extractToken(first)
if (!t1) throw new Error("bot1 token missing in: " + first.slice(0, 200))
console.log("bot1 token:", t1)
results.push({ name: "EuroRWA Data", username: "EuroRWA_Data_bot", token: t1 })

console.log("\n=== EuroRWA Build ===")
const r1 = await sendMsg(ws, "/newbot")
console.log("1:", r1.slice(0, 60))
if (!/Alright/i.test(r1)) throw new Error("expected name prompt")

const r2 = await sendMsg(ws, "EuroRWA Build")
console.log("2:", r2.slice(0, 60))
if (!/username/i.test(r2)) throw new Error("expected username prompt")

let r3 = await sendMsg(ws, "EuroRWA_Build_bot")
console.log("3:", r3.slice(0, 60))
if (/taken|unavailable|invalid/i.test(r3)) {
  console.log("trying alt")
  r3 = await sendMsg(ws, "EuroRWA_Build_2026_bot")
}

const t2 = extractToken(r3)
if (!t2) throw new Error("no token in: " + r3.slice(0, 300))
console.log("bot2 token:", t2)
results.push({ name: "EuroRWA Build", username: "EuroRWA_Build_bot", token: t2 })

await Bun.write("data/tg-bots.json", JSON.stringify(results, null, 2))
console.log("saved data/tg-bots.json")
process.exit(0)
