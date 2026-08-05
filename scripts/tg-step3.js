import { listTabs, connect, evalValue, waitFor, typeText, rectFor, send } from "./tg-cdp.js"

const tabs = await listTabs()
const tg = tabs.find((t) => t.url.includes("web.telegram.org"))
const ws = await connect(tg.webSocketDebuggerUrl)

const f = await evalValue(
  ws,
  `(() => {
  const i = document.querySelector('input[placeholder="Search"]')
  if (!i) return "no-input"
  i.focus()
  i.value = ""
  return "focused"
})()`,
)
console.log("focus:", f)
await typeText(ws, "BotFather")
await new Promise((r) => setTimeout(r, 4000))

const results = await evalValue(
  ws,
  `JSON.stringify([...document.querySelectorAll("li, div")].filter(e => e.children.length === 0 && e.textContent.includes("BotFather")).map(e => e.textContent.trim().slice(0, 60)).slice(0, 10))`,
)
console.log("results:", results)
process.exit(0)
