import { listTabs, connect, evalValue, waitFor } from "./tg-cdp.js"

const tabs = await listTabs()
const tg = tabs.find((t) => t.url.includes("web.telegram.org"))
const ws = await connect(tg.webSocketDebuggerUrl)

await evalValue(ws, `location.hash = "#@BotFather"; "set"`)
await new Promise((r) => setTimeout(r, 6000))

const info = await evalValue(
  ws,
  `JSON.stringify({
    hash: location.hash,
    title: document.querySelector(".chat-title")?.textContent,
    editable: !!document.querySelector(".input-message-input"),
    inputCls: document.querySelector(".input-message-input")?.className,
    body: document.body.innerText.slice(0, 120),
  })`,
)
console.log(info)
process.exit(0)
