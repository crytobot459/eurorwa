import { getWs, reload, openChat, sendMsg } from "./tg-helpers.js"

function extractToken(txt) {
  const m = txt.match(/HTTP API:(\d{8,10}:[A-Za-z0-9_-]+)Keep/)
  if (m) return m[1]
  const m2 = txt.match(/\b(\d{8,10}:[A-Za-z0-9_-]{35})(?=Keep|\s|$)/)
  return m2 ? m2[1] : null
}

const alts = ["EuroRWA_Build_2026_bot", "EuroRWA_Build_Agent_bot", "EuroRWA_Build_App_bot"]

const ws = await getWs()
await reload(ws)
await openChat(ws, "BotFather")

const r1 = await sendMsg(ws, "/newbot")
console.log("1:", r1.slice(0, 60))
if (!/Alright/i.test(r1)) throw new Error("expected name prompt")

const r2 = await sendMsg(ws, "EuroRWA Build")
console.log("2:", r2.slice(0, 60))
if (!/username/i.test(r2)) throw new Error("expected username prompt")

for (const alt of alts) {
  console.log("trying:", alt)
  const r3 = await sendMsg(ws, alt)
  console.log("  ->", r3.slice(0, 50))
  const t = extractToken(r3)
  if (t) {
    console.log("TOKEN:", t)
    const saved = JSON.parse(await Bun.file("data/tg-bots.json").text())
    saved.push({ name: "EuroRWA Build", username: alt, token: t })
    await Bun.write("data/tg-bots.json", JSON.stringify(saved, null, 2))
    console.log("saved data/tg-bots.json")
    process.exit(0)
  }
  if (!/taken/i.test(r3)) {
    console.log("unexpected reply, abort:", r3.slice(0, 150))
    process.exit(1)
  }
}
console.log("all usernames taken")
process.exit(1)
