import { listTabs, connect, evalValue, realClick } from "./tg-cdp.js"

const tabs = await listTabs()
const tg = tabs.find((t) => t.url.includes("web.telegram.org"))
if (!tg) throw new Error("no telegram tab")
const ws = await connect(tg.webSocketDebuggerUrl)

const info = await evalValue(
  ws,
  `JSON.stringify({
    url: location.href,
    btns: [...document.querySelectorAll("button")].map(b => b.textContent.trim()).slice(0, 20),
  })`,
)
console.log(info)

const r = await realClick(ws, "Yes, it's me")
console.log("click:", r)
await new Promise((r) => setTimeout(r, 4000))
const body = await evalValue(ws, `document.body.innerText.slice(0, 200)`)
console.log("body:", JSON.stringify(body))
process.exit(0)
